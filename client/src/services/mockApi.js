// Mock API für Tests ohne Backend-Server
// Simuliert alle API-Aufrufe im Browser

// Mock-Daten
const mockUsers = [
  {
    id: 'admin-1',
    name: 'Ali Almani',
    email: 'admin@az-handy.berlin',
    password: 'Admin123!', // Nur für Mock - wird nicht wirklich verwendet
    role: 'Administrator',
    createdAt: new Date().toISOString()
  },
  {
    id: 'user-1',
    name: 'Test Benutzer',
    email: 'test@example.com',
    password: 'test123',
    role: 'user',
    createdAt: new Date().toISOString()
  }
];

// Simuliere Verzögerung wie bei echter API
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Token Generator
const generateMockToken = (userId) => {
  return `mock-token-${userId}-${Date.now()}`;
};

// Mock API Service
const mockApi = {
  // Login
  async login(credentials) {
    await delay(800);
    
    const { email, password } = credentials;
    const user = mockUsers.find(u => u.email === email);
    
    if (!user) {
      throw {
        response: {
          status: 401,
          data: { message: 'Ungültige Anmeldedaten' }
        }
      };
    }
    
    // Für Mock: Akzeptiere jedes Passwort oder prüfe gegen gespeichertes
    if (password !== user.password && password !== 'Admin123!' && password !== 'test123') {
      throw {
        response: {
          status: 401,
          data: { message: 'Ungültige Anmeldedaten' }
        }
      };
    }
    
    const token = generateMockToken(user.id);
    
    return {
      data: {
        success: true,
        message: 'Login erfolgreich',
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role === 'admin' ? 'Administrator' : user.role,
          avatar: user.avatar || null
        }
      }
    };
  },

  // Register
  async register(userData) {
    await delay(1000);
    
    const { name, email, password } = userData;
    
    // Prüfe ob Benutzer bereits existiert
    const existingUser = mockUsers.find(u => u.email === email);
    if (existingUser) {
      throw {
        response: {
          status: 400,
          data: { message: 'Benutzer existiert bereits' }
        }
      };
    }
    
    // Erstelle neuen Benutzer
    const newUser = {
      id: `user-${Date.now()}`,
      name,
      email,
      password, // In echtem System würde das gehasht werden
      role: 'Marketing',
      createdAt: new Date().toISOString()
    };
    
    mockUsers.push(newUser);
    
    const token = generateMockToken(newUser.id);
    
    return {
      data: {
        success: true,
        message: 'Registrierung erfolgreich',
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    };
  },

  // Get User Profile
  async getProfile(token) {
    await delay(500);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    // Extrahiere User ID aus Token (vereinfacht für Mock)
    // Token Format: mock-token-{userId}-{timestamp}
    const tokenParts = token.split('-');
    const userId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    
    if (!userId) {
      throw {
        response: {
          status: 401,
          data: { message: 'Ungültiger Token' }
        }
      };
    }
    
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      throw {
        response: {
          status: 404,
          data: { message: 'Benutzer nicht gefunden' }
        }
      };
    }
    
    return {
      data: {
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar || null,
          createdAt: user.createdAt
        }
      }
    };
  },

  // Update Profile
  async updateProfile(token, updates) {
    await delay(800);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    // Extrahiere User ID aus Token
    const tokenParts = token.split('-');
    const userId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    
    if (!userId) {
      throw {
        response: {
          status: 401,
          data: { message: 'Ungültiger Token' }
        }
      };
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw {
        response: {
          status: 404,
          data: { message: 'Benutzer nicht gefunden' }
        }
      };
    }
    
    // Update user
    if (updates.name) mockUsers[userIndex].name = updates.name;
    if (updates.email) {
      // Prüfe ob Email bereits verwendet wird
      const emailExists = mockUsers.some(u => u.email === updates.email && u.id !== userId);
      if (emailExists) {
        throw {
          response: {
            status: 400,
            data: { message: 'E-Mail wird bereits verwendet' }
          }
        };
      }
      mockUsers[userIndex].email = updates.email;
    }
    if (updates.avatar) {
      mockUsers[userIndex].avatar = updates.avatar;
    }
    
    return {
      data: {
        success: true,
        message: 'Profil erfolgreich aktualisiert',
        user: {
          id: mockUsers[userIndex].id,
          name: mockUsers[userIndex].name,
          email: mockUsers[userIndex].email,
          role: mockUsers[userIndex].role,
          avatar: mockUsers[userIndex].avatar || null
        }
      }
    };
  },

  // Update Password
  async updatePassword(token, passwordData) {
    await delay(800);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    const tokenParts = token.split('-');
    const userId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    
    if (!userId) {
      throw {
        response: {
          status: 401,
          data: { message: 'Ungültiger Token' }
        }
      };
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw {
        response: {
          status: 404,
          data: { message: 'Benutzer nicht gefunden' }
        }
      };
    }
    
    // Prüfe aktuelles Passwort
    if (passwordData.currentPassword !== mockUsers[userIndex].password && 
        passwordData.currentPassword !== 'Admin123!' && 
        passwordData.currentPassword !== 'test123') {
      throw {
        response: {
          status: 400,
          data: { message: 'Aktuelles Passwort ist falsch' }
        }
      };
    }
    
    // Update password
    mockUsers[userIndex].password = passwordData.newPassword;
    
    return {
      data: {
        success: true,
        message: 'Passwort erfolgreich geändert'
      }
    };
  },

  // Create User by Admin
  async createUserByAdmin(token, userData) {
    await delay(800);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    // Prüfe ob Admin
    const tokenParts = token.split('-');
    const userId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    const adminUser = mockUsers.find(u => u.id === userId);
    
    if (!adminUser || (adminUser.role !== 'Administrator' && adminUser.role !== 'admin')) {
      throw {
        response: {
          status: 403,
          data: { message: 'Nur Administratoren können Benutzer erstellen' }
        }
      };
    }
    
    // Prüfe ob Email bereits existiert
    const existingUser = mockUsers.find(u => u.email === userData.email);
    if (existingUser) {
      throw {
        response: {
          status: 400,
          data: { message: 'E-Mail wird bereits verwendet' }
        }
      };
    }
    
    // Erstelle neuen Benutzer
    const newUser = {
      id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      password: userData.password,
      role: userData.role || 'Marketing Mitarbeiter',
      avatar: userData.avatar || null,
      createdAt: new Date().toISOString()
    };
    
    mockUsers.push(newUser);
    
    return {
      data: {
        success: true,
        message: 'Benutzer erfolgreich erstellt',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          avatar: newUser.avatar || null
        }
      }
    };
  },

  // Get All Users (Admin only)
  async getAllUsers(token) {
    await delay(500);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    // Prüfe ob Admin
    const tokenParts = token.split('-');
    const userId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    const adminUser = mockUsers.find(u => u.id === userId);
    
    if (!adminUser || (adminUser.role !== 'Administrator' && adminUser.role !== 'admin')) {
      throw {
        response: {
          status: 403,
          data: { message: 'Nur Administratoren können alle Benutzer sehen' }
        }
      };
    }
    
    // Rückgabe aller Benutzer ohne Passwörter
    const usersWithoutPasswords = mockUsers.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      avatar: u.avatar || null,
      createdAt: u.createdAt
    }));
    
    return {
      data: {
        success: true,
        users: usersWithoutPasswords
      }
    };
  },

  // Delete User (Admin only)
  async deleteUser(token, userId) {
    await delay(500);
    
    if (!token) {
      throw {
        response: {
          status: 401,
          data: { message: 'Nicht autorisiert' }
        }
      };
    }
    
    // Prüfe ob Admin
    const tokenParts = token.split('-');
    const adminId = tokenParts.length >= 3 ? tokenParts.slice(2, -1).join('-') : null;
    const adminUser = mockUsers.find(u => u.id === adminId);
    
    if (!adminUser || (adminUser.role !== 'Administrator' && adminUser.role !== 'admin')) {
      throw {
        response: {
          status: 403,
          data: { message: 'Nur Administratoren können Benutzer löschen' }
        }
      };
    }
    
    // Verhindere Selbstlöschung
    if (adminId === userId) {
      throw {
        response: {
          status: 400,
          data: { message: 'Sie können sich nicht selbst löschen' }
        }
      };
    }
    
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw {
        response: {
          status: 404,
          data: { message: 'Benutzer nicht gefunden' }
        }
      };
    }
    
    mockUsers.splice(userIndex, 1);
    
    return {
      data: {
        success: true,
        message: 'Benutzer erfolgreich gelöscht'
      }
    };
  }
};

export default mockApi;
