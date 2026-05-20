import { createServerFn } from "@tanstack/react-start";
import { seedDemo, clearDemo, checkDemo } from "./demo.server";

export const seedDemoData = createServerFn({ method: "POST" }).handler(async () => {
  return seedDemo();
});

export const clearDemoData = createServerFn({ method: "POST" }).handler(async () => {
  return clearDemo();
});

export const hasDemoData = createServerFn({ method: "GET" }).handler(async () => {
  return checkDemo();
});
