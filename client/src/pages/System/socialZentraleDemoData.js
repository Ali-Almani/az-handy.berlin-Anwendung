export const SOCIAL_CHANNELS = [
  { id: 'whatsapp', label: 'WhatsApp', short: 'WA' },
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'tiktok', label: 'TikTok', short: 'TT' }
];

export const SOCIAL_TICKET_STATUS_OPTIONS = ['Offen', 'In Bearbeitung', 'Erledigt'];

export const SOCIAL_STORAGE_KEY = 'az-social-zentrale-demo-v1';

const SEED_TICKETS = [
  {
    id: 'WA-31082026-001',
    channel: 'whatsapp',
    customerName: 'Fatima Kaya',
    handle: '+49 176 8821 4410',
    ticketStatus: 'Offen',
    unread: true,
    createdAt: '2026-08-31T08:14:00.000Z',
    messages: [
      {
        id: 'wa-001-1',
        from: 'customer',
        text: 'Guten Morgen, haben Sie das iPhone 16 128 GB in Schwarz noch da? Ich würde heute Nachmittag in die Zentrale kommen.',
        at: '2026-08-31T08:14:00.000Z'
      }
    ]
  },
  {
    id: 'WA-31082026-002',
    channel: 'whatsapp',
    customerName: 'Mehmet Özdemir',
    handle: '+49 157 3340 2291',
    ticketStatus: 'In Bearbeitung',
    unread: false,
    createdAt: '2026-08-31T07:42:00.000Z',
    messages: [
      {
        id: 'wa-002-1',
        from: 'customer',
        text: 'Hallo, ich möchte meine Nummer mitnehmen (MNP). Aktuell bin ich bei Vodafone. Was muss ich mitbringen?',
        at: '2026-08-31T07:42:00.000Z'
      },
      {
        id: 'wa-002-2',
        from: 'agent',
        authorName: 'Büro Zentrale',
        text: 'Guten Tag Mehmet, bitte Personalausweis und die aktuelle Vertragsnummer. Wir legen Ihnen ein MNP-Ticket an.',
        at: '2026-08-31T07:55:00.000Z'
      },
      {
        id: 'wa-002-3',
        from: 'customer',
        text: 'Super, danke. Ich komme gegen 16 Uhr.',
        at: '2026-08-31T08:02:00.000Z'
      }
    ]
  },
  {
    id: 'WA-30082026-003',
    channel: 'whatsapp',
    customerName: 'Lisa Weber',
    handle: '+49 163 5512 9088',
    ticketStatus: 'Offen',
    unread: true,
    createdAt: '2026-08-30T16:21:00.000Z',
    messages: [
      {
        id: 'wa-003-1',
        from: 'customer',
        text: 'Gibt es noch Friends & Family Voucher für Ay Yildiz? Der Code von letzter Woche war schon vergeben.',
        at: '2026-08-30T16:21:00.000Z'
      }
    ]
  },
  {
    id: 'IG-31082026-001',
    channel: 'instagram',
    customerName: 'Sara Müller',
    handle: '@sara.mueller.bln',
    ticketStatus: 'Offen',
    unread: true,
    createdAt: '2026-08-31T09:05:00.000Z',
    messages: [
      {
        id: 'ig-001-1',
        from: 'customer',
        text: 'Hi 👋 eure Story zum iPhone 16e – ist der Preis nur heute oder die ganze Woche? Und könnt ihr reservieren?',
        at: '2026-08-31T09:05:00.000Z'
      }
    ]
  },
  {
    id: 'IG-30082026-002',
    channel: 'instagram',
    customerName: 'Berlin Tech Daily',
    handle: '@berlin.tech.daily',
    ticketStatus: 'In Bearbeitung',
    unread: false,
    createdAt: '2026-08-30T11:18:00.000Z',
    messages: [
      {
        id: 'ig-002-1',
        from: 'customer',
        text: 'Können wir euren Shop für eine kurze Reel-Kooperation anfragen? Thema: ehrlicher Handy-Check vor dem Kauf.',
        at: '2026-08-30T11:18:00.000Z'
      },
      {
        id: 'ig-002-2',
        from: 'agent',
        authorName: 'Marketing',
        text: 'Danke für die Anfrage – wir leiten das intern weiter und melden uns mit Terminvorschlag.',
        at: '2026-08-30T12:40:00.000Z'
      }
    ]
  },
  {
    id: 'TT-31082026-001',
    channel: 'tiktok',
    customerName: 'Nisa Yildiz',
    handle: '@nisa.shop',
    ticketStatus: 'Offen',
    unread: true,
    createdAt: '2026-08-31T10:28:00.000Z',
    messages: [
      {
        id: 'tt-001-1',
        from: 'customer',
        text: 'Unter eurem Video zum Xiaomi 17T Pro: geht das Gerät auch ohne Vertrag? Und habt ihr 512 GB?',
        at: '2026-08-31T10:28:00.000Z'
      }
    ]
  },
  {
    id: 'TT-29082026-002',
    channel: 'tiktok',
    customerName: 'Handycheck Kai',
    handle: '@handycheck.kai',
    ticketStatus: 'Erledigt',
    unread: false,
    createdAt: '2026-08-29T14:03:00.000Z',
    messages: [
      {
        id: 'tt-002-1',
        from: 'customer',
        text: 'Wann habt ihr am Samstag auf? Will nur kurz ein Gerät abholen das ihr zurückgelegt habt.',
        at: '2026-08-29T14:03:00.000Z'
      },
      {
        id: 'tt-002-2',
        from: 'agent',
        authorName: 'Shop Zentrale',
        text: 'Samstag 10–16 Uhr, Abholung an der Theke auf den Namen Kai. Bis dann!',
        at: '2026-08-29T14:22:00.000Z'
      },
      {
        id: 'tt-002-3',
        from: 'customer',
        text: 'Perfekt, danke 🙏',
        at: '2026-08-29T14:25:00.000Z'
      }
    ]
  }
];

export const SOCIAL_QUICK_REPLIES = [
  'Guten Tag, vielen Dank für Ihre Nachricht. Wir prüfen das und melden uns gleich.',
  'Das Gerät ist verfügbar. Wann passt es Ihnen in der Filiale?',
  'Bitte nennen Sie uns Modell, Speicher und Farbe – dann schauen wir in den Bestand.'
];

function cloneSeed() {
  return JSON.parse(JSON.stringify(SEED_TICKETS));
}

export function lastMessageAt(ticket) {
  const last = ticket?.messages?.[ticket.messages.length - 1];
  return last?.at || ticket?.createdAt || '';
}

export function countUnreadSocialTickets(tickets) {
  return (tickets || []).filter((t) => t.unread && t.ticketStatus !== 'Erledigt').length;
}

export function loadSocialTickets() {
  try {
    const raw = localStorage.getItem(SOCIAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* Demo-Store ungültig – Seed verwenden */
  }
  return cloneSeed();
}

export function saveSocialTickets(tickets) {
  try {
    localStorage.setItem(SOCIAL_STORAGE_KEY, JSON.stringify(tickets));
  } catch {
    /* Quota / privater Modus – Demo läuft trotzdem im Speicher */
  }
}

export function resetSocialTickets() {
  try {
    localStorage.removeItem(SOCIAL_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  return cloneSeed();
}
