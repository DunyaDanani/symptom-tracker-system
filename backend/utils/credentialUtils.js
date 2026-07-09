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