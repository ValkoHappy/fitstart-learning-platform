const STORAGE_KEY = "fitstart-learning-demo-v1";
export const demoUser = {
  id: 1,
  login: "demo_student",
  first_name: "Демо",
  last_name: "Ученик",
  email: "student@example.com",
  phone: "",
  role: "student",
};
export class DemoStore {
  constructor(storage = localStorage) {
    this.storage = storage;
    try {
      this.state = JSON.parse(storage.getItem(STORAGE_KEY));
    } catch {
      this.state = null;
    }
    if (this.state?.version !== 1)
      this.state = { version: 1, user: demoUser, accounts: [], progress: {} };
  }
  save() {
    this.storage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }
  user() {
    return this.state.user;
  }
  setUser(user) {
    this.state.user = user;
    this.save();
  }
  lesson(id) {
    return this.state.progress[this.user()?.id]?.[id] || {};
  }
  updateLesson(id, patch) {
    const userId = this.user()?.id;
    if (!userId) throw new Error("Нужна авторизация");
    this.state.progress[userId] ||= {};
    this.state.progress[userId][id] = { ...this.lesson(id), ...patch };
    this.save();
  }
}
