const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "password123",
  "1234567890",
  "123456789",
  "qwertyuiop",
  "iloveyou1",
  "welcome123",
  "letmein123",
  "admin12345",
  "wedding123",
  "changeme12",
]);

export function passwordProblem(password: string): string | null {
  if (password.length < 10 || password.length > 128) return "Use 10 to 128 characters.";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "That password is too common. Choose another.";
  return null;
}
