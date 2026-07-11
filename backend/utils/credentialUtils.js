// Generates a username like "ahmed.rashid482" - readable but unique
export const generateUsername = async (firstName, lastName, User) => {
  const base = `${firstName}.${lastName}`
    .toLowerCase()
    .replace(/[^a-z.]/g, "");

  let username;
  let isUnique = false;

  while (!isUnique) {
    const randomDigits = Math.floor(100 + Math.random() * 900); // 3 digits
    username = `${base}${randomDigits}`;
    const existing = await User.findOne({ username });
    if (!existing) isUnique = true;
  }

  return username;
};

// Generates a simple temporary password like "Oki4728!"
export const generateTempPassword = () => {
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `Oki${randomDigits}!`;
};

// --- Short, memorable credentials for student / parent / shadow teacher ---
// Username = password to start with, so it's easy for a child (or a busy
// parent) to use on day one. Everyone can change both after logging in,
// via /api/auth/change-username and /api/auth/change-password.

const cleanNamePart = (raw) =>
  (raw || "").toLowerCase().replace(/[^a-z]/g, ""); // strips spaces, "Mrs.", etc.

const lastDigits = (raw, count) => {
  const digits = (raw || "").replace(/\D/g, "");
  return digits.slice(-count).padStart(count, "0");
};

// Only appends a small numeric suffix if the base username is already
// taken — keeps the common case short (e.g. "peiris177", not "peiris1771").
const ensureUniqueUsername = async (base, User) => {
  let username = base;
  let n = 1;
  while (await User.findOne({ username })) {
    username = `${base}${n}`;
    n++;
  }
  return username;
};

// Student: username = admission number, password = same.
export const generateStudentCredentials = async (admissionNumber, User) => {
  const base = (admissionNumber || "").trim();
  const username = await ensureUniqueUsername(base, User);
  return { username, password: username };
};

// Parent: username = first name + last 3 digits of phone number, password
// = same.
export const generateParentCredentials = async (parentFirstName, parentPhone, User) => {
  const base = `${cleanNamePart(parentFirstName)}${lastDigits(parentPhone, 3)}`;
  const username = await ensureUniqueUsername(base, User);
  return { username, password: username };
};

// Shadow teacher: username = first name + last 3 digits of the student's
// admission number, password = same.
export const generateTeacherCredentials = async (teacherName, admissionNumber, User) => {
  const firstNamePart = (teacherName || "").trim().split(/\s+/)[0] || "teacher";
  const base = `${cleanNamePart(firstNamePart)}${lastDigits(admissionNumber, 3)}`;
  const username = await ensureUniqueUsername(base, User);
  return { username, password: username };
};