import { DemoStore, demoUser } from "./DemoStore";
import { DemoLearningService } from "./DemoLearningService";
import { demoCourses } from "./courses";
async function passwordDigest(login, password) {
  const bytes = new TextEncoder().encode(login + ":" + password);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}
function requestData(config) {
  if (config.data instanceof FormData) {
    const result = Object.fromEntries(config.data.entries());
    result.files = config.data.getAll("files[]");
    return result;
  }
  return typeof config.data === "string"
    ? JSON.parse(config.data)
    : config.data || {};
}
export function createDemoAdapter(storage) {
  const store = new DemoStore(storage),
    learning = new DemoLearningService(store);
  return async (config) => {
    const url = new URL(config.url, "https://fitstart.example");
    const action = url.searchParams.get("action"),
      data = requestData(config);
    let result;
    try {
      switch (action) {
        case "check_auth":
          result = {
            success: true,
            authenticated: Boolean(store.user()),
            user: store.user(),
          };
          break;
        case "logout":
          store.setUser(null);
          result = { success: true };
          break;
        case "login": {
          const account = store.state.accounts.find(
            (item) => item.login === data.login || item.email === data.login,
          );
          if (
            data.login === "demo_student" &&
            data.password === "FitStartDemo1!"
          )
            store.setUser(demoUser);
          else if (
            account &&
            account.digest ===
              (await passwordDigest(account.login, data.password))
          ) {
            const { digest, ...user } = account;
            store.setUser(user);
          } else throw new Error("Неверный логин или пароль");
          result = { success: true, authenticated: true, user: store.user() };
          break;
        }
        case "register": {
          if (
            !data.login ||
            !data.email ||
            !data.first_name ||
            !data.last_name ||
            data.password?.length < 8
          )
            throw new Error(
              "Заполните обязательные поля. Пароль должен быть не короче 8 символов",
            );
          if (
            data.login === demoUser.login ||
            store.state.accounts.some(
              (item) => item.login === data.login || item.email === data.email,
            )
          )
            throw new Error("Пользователь уже существует");
          const { password, ...fields } = data;
          store.state.accounts.push({
            ...fields,
            id: Date.now(),
            role: "student",
            digest: await passwordDigest(fields.login, password),
          });
          store.save();
          result = {
            success: true,
            authenticated: false,
            message: "Регистрация завершена. Теперь войдите в аккаунт.",
          };
          break;
        }
        case "getCourses":
          result = demoCourses.map((course) => learning.summary(course));
          break;
        case "getCourse": {
          const course = learning.course(url.searchParams.get("id"));
          result = course
            ? { success: true, ...learning.summary(course) }
            : { success: false, message: "Курс не найден" };
          break;
        }
        case "getCourseContent": {
          const modules = learning.modules(url.searchParams.get("id"));
          if (!store.user())
            for (const module of modules)
              for (const lesson of module.lessons) {
                lesson.content = "";
                lesson.video_ref = "";
                lesson.locked_preview = true;
              }
          result = { success: true, modules };
          break;
        }
        case "getApplications":
          result = [];
          break;
        case "completeLesson":
          result = learning.complete(data.lesson_id);
          break;
        case "submitAssignment":
          result = learning.submitAssignment(data);
          break;
        case "submitQuiz":
          result = learning.submitQuiz(data);
          break;
        case "requestPasswordReset":
        case "resetPassword":
        case "validatePasswordResetToken":
          throw new Error(
            "Отправка писем доступна в серверной версии. Для просмотра войдите как demo_student с паролем FitStartDemo1!",
          );
        default:
          throw new Error("Действие доступно в серверной версии");
      }
    } catch (error) {
      result = { success: false, message: error.message };
    }
    return { data: result, status: 200, statusText: "OK", headers: {}, config };
  };
}
