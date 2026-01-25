import { User, Role, Zone, Entry } from './types';

export const LANGUAGES = ['PT', 'EN', 'ES', 'FR', 'DE', 'IT'];
export const DESIGNATIONS = ['WORKSHOP', 'DEVOCIONAL', 'SUB', 'TEATRO', 'OUTROS'];

export const ZONES: Zone[] = [
  { id: 'z1', name: 'Zona Menezes - Brasil', supervisorId: 'u1' },
];

const INSTRUCTOR_NAMES = [
  "I. Freitas",
  "I. Holanda",
  "I. José",
  "I. Lucas",
  "I. Melo",
  "I. Nascimento",
  "I. Noronha",
  "I. Pires",
  "Ia. Aguiar",
  "Ia. Bispo",
  "Ia. Cruz",
  "Ia. Salvatierra",
  "Ia. Torres"
];

// Helper to create users
const createInstructors = (): User[] => {
  return INSTRUCTOR_NAMES.map((name, index) => {
    // Determine languages based on name for variety in demo
    const langs = index % 2 === 0 ? ['PT', 'EN'] : ['PT', 'ES'];
    if (index % 3 === 0) langs.push('FR');

    return {
      id: `inst-${index + 1}`,
      name: name,
      email: `${name.toLowerCase().replace(' ', '.').replace('.', '')}@example.com`,
      role: Role.INSTRUCTOR,
      zoneId: 'z1',
      photoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
      languages: langs,
      designations: ['WORKSHOP', 'DEVOCIONAL', 'SUB', 'TEATRO', 'OUTROS'],
      password: '123',
      targetHours: 50, // Default target
      subgroup: index % 2 === 0 ? 'Equipe A' : 'Equipe B'
    };
  });
};

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'i. Menezes',
    email: 'supervisor@example.com',
    role: Role.SUPERVISOR,
    zoneId: 'z1',
    photoUrl: 'https://ui-avatars.com/api/?name=i.+Menezes&background=0D8ABC&color=fff',
    languages: ['PT', 'EN', 'ES'],
    designations: ['Revisão', 'Coordenação'],
    password: 'admin'
  },
  ...createInstructors()
];

// Generate some mock entries for the last 30 days
const generateMockEntries = (): Entry[] => {
  const entries: Entry[] = [];
  const today = new Date();
  
  // Create entries for random instructors
  const targetUsers = USERS.filter(u => u.role === Role.INSTRUCTOR);

  targetUsers.forEach(user => {
    // Randomize number of entries per user
    const numEntries = Math.floor(Math.random() * 10) + 5;
    
    for (let i = 0; i < numEntries; i++) {
      const date = new Date(today);
      const daysAgo = Math.floor(Math.random() * 30);
      date.setDate(date.getDate() - daysAgo);
      
      // Recent entries might be pending
      const isRecent = daysAgo < 3;
      
      entries.push({
        id: `e-${user.id}-${i}`,
        userId: user.id,
        zoneId: user.zoneId,
        date: date.toISOString().split('T')[0],
        designation: user.designations[Math.floor(Math.random() * user.designations.length)],
        languages: user.languages, // Use user languages directly
        hours: Number((Math.random() * 4 + 0.5).toFixed(1)),
        notes: Math.random() > 0.8 ? "Atividade regular" : "",
        status: isRecent && Math.random() > 0.5 ? 'pending' : 'approved',
        createdAt: new Date().toISOString(),
        editCount: 0,
        history: [], 
      });
    }
  });

  return entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const INITIAL_ENTRIES: Entry[] = generateMockEntries();