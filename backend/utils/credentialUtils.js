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
//
// `session` (optional) ties this check into the caller's Mongo transaction,
// so it sees the transaction's own in-flight writes and — combined with the
// unique index on User.username — the whole registration rolls back
// together if a race is lost, instead of leaving orphaned accounts behind.
const ensureUniqueUsername = async (base, User, session) => {
  let username = base;
  let n = 1;
  while (await User.findOne({ username }).session(session)) {
    username = `${base}${n}`;
    n++;
  }
  return username;
};

// Student: username = admission number, password = same.
export const generateStudentCredentials = async (admissionNumber, User, session) => {
  const base = (admissionNumber || "").trim();
  const username = await ensureUniqueUsername(base, User, session);
  return { username, password: username };
};

// Parent: username = first name + last 3 digits of the student's admission
// number, password = same. Using the admission number (rather than phone
// number) keeps the parent credential tied to the same student/admission
// scheme as the teacher credential below, and guarantees uniqueness even
// when two parents share a first name — collisions still fall back to
// ensureUniqueUsername's numeric suffix as a final safety net. The parent
// name field now accepts a full name (not just a first name), so only the
// first word is used here — otherwise usernames would balloon into
// something like "nadeeshaperera047" instead of "nadeesha047".
export const generateParentCredentials = async (parentName, admissionNumber, User, session) => {
  const firstNamePart = (parentName || "").trim().split(/\s+/)[0] || "parent";
  const base = `${cleanNamePart(firstNamePart)}${lastDigits(admissionNumber, 3)}`;
  const username = await ensureUniqueUsername(base, User, session);
  return { username, password: username };
};

// Shadow teacher: username = "stf." + first name + last 3 digits of the
// student's admission number, password = same. The "stf." prefix (Shadow
// TeacherF) exists purely to keep teacher usernames visually distinct from
// parent usernames — without it, a teacher and a parent who share a first
// name and get linked to admission numbers ending the same way would land
// on the same base string. ensureUniqueUsername's numeric-suffix fallback
// already guarantees no two accounts can literally collide (there's a
// unique index on User.username), but that fallback alone produces
// confusingly similar-looking pairs like "nadeesha047" / "nadeesha0471" —
// this prefix avoids relying on that as the first line of defense.
export const generateTeacherCredentials = async (teacherName, admissionNumber, User, session) => {
  const firstNamePart = (teacherName || "").trim().split(/\s+/)[0] || "teacher";
  const base = `stf.${cleanNamePart(firstNamePart)}${lastDigits(admissionNumber, 3)}`;
  const username = await ensureUniqueUsername(base, User, session);
  return { username, password: username };
};