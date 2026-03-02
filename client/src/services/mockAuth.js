const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));
const generateMockToken = (userId) => `mock-token-${userId}-${Date.now()}`;

export const mockLogin = async (mockUsers, credentials) => {
  await delay(800);
  const { email, password } = credentials;
  const user = mockUsers.find(u => u.email === email);
  if (!user) throw { response: { status: 401, data: { message: 'Ungültige Anmeldedaten' } } };
  if (password !== user.password && password !== 'Admin123!' && password !== 'test123') {
    throw { response: { status: 401, data: { message: 'Ungültige Anmeldedaten' } } };
  }
  const token = generateMockToken(user.id);
  return {
    data: {
      success: true,
      message: 'Login erfolgreich',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role === 'admin' ? 'Administrator' : user.role, avatar: user.avatar || null }
    }
  };
};

export const mockRegister = async (mockUsers, userData) => {
  await delay(1000);
  const { name, email, password } = userData;
  if (mockUsers.find(u => u.email === email)) {
    throw { response: { status: 400, data: { message: 'Benutzer existiert bereits' } } };
  }
  const newUser = { id: `user-${Date.now()}`, name, email, password, role: 'Marketing', createdAt: new Date().toISOString() };
  mockUsers.push(newUser);
  const token = generateMockToken(newUser.id);
  return {
    data: {
      success: true,
      message: 'Registrierung erfolgreich',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role }
    }
  };
};
