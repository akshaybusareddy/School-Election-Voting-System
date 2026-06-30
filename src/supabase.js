import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const MOCK_CANDIDATES = [
  { id: 1, name: 'Arjun Kumar', position: 'SPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=arjun' },
  { id: 2, name: 'Sophia Sen', position: 'SPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=sophia' },
  { id: 3, name: 'Kabir Dev', position: 'SPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=kabir' },
  { id: 4, name: 'Vikram Shah', position: 'ASPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=vikram' },
  { id: 5, name: 'Ananya Roy', position: 'ASPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=ananya' },
  { id: 6, name: 'Diya Bose', position: 'ASPL', image_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=diya' }
];

// Initialize localStorage with mock data if needed
const initMockDB = () => {
  if (!localStorage.getItem('election_candidates')) {
    localStorage.setItem('election_candidates', JSON.stringify(MOCK_CANDIDATES));
  }
  if (!localStorage.getItem('election_tokens')) {
    // Generate some default tokens
    const defaultTokens = [
      { id: '1', pin_code: 'A7X9-B2', is_used: false, created_at: new Date().toISOString() },
      { id: '2', pin_code: 'K3M8-L4', is_used: false, created_at: new Date().toISOString() },
      { id: '3', pin_code: 'J5P2-Q9', is_used: false, created_at: new Date().toISOString() },
      { id: '4', pin_code: 'D6R1-T8', is_used: true, created_at: new Date().toISOString() } // example used PIN
    ];
    localStorage.setItem('election_tokens', JSON.stringify(defaultTokens));
  }
  if (!localStorage.getItem('election_votes')) {
    // Some initial votes to make the chart look nice initially
    const initialVotes = [
      { id: 1, candidate_id: 1, created_at: new Date().toISOString() },
      { id: 2, candidate_id: 1, created_at: new Date().toISOString() },
      { id: 3, candidate_id: 2, created_at: new Date().toISOString() },
      { id: 4, candidate_id: 4, created_at: new Date().toISOString() },
      { id: 5, candidate_id: 5, created_at: new Date().toISOString() }
    ];
    localStorage.setItem('election_votes', JSON.stringify(initialVotes));
  }
};

// Create a mock Supabase client that mimics the JS SDK API
const createMockClient = () => {
  initMockDB();
  console.warn('⚠️ Supabase environment variables are missing. Using LOCAL MOCK DB (localStorage fallback).');

  const buildQuery = (table) => {
    let items = JSON.parse(localStorage.getItem(`election_${table}`) || '[]');
    let isSingle = false;

    const queryBuilder = {
      select: (q) => queryBuilder,
      eq: (col, val) => {
        items = items.filter(item => item[col] === val);
        return queryBuilder;
      },
      neq: (col, val) => {
        items = items.filter(item => item[col] !== val);
        return queryBuilder;
      },
      or: (filters) => {
        // e.g. pin_code.eq.A7X9-B2,pin_code.eq.A7X9B2
        const filterList = filters.split(',').map(f => {
          const parts = f.trim().split('.');
          return { col: parts[0], val: parts[2] };
        });
        items = items.filter(item => {
          return filterList.some(f => String(item[f.col]) === String(f.val));
        });
        return queryBuilder;
      },
      order: (col, options) => {
        const ascending = options?.ascending !== false;
        items = [...items].sort((a, b) => {
          if (a[col] < b[col]) return ascending ? -1 : 1;
          if (a[col] > b[col]) return ascending ? 1 : -1;
          return 0;
        });
        return queryBuilder;
      },
      single: () => {
        isSingle = true;
        return queryBuilder;
      },
      // Thenable implementation to await queries
      then: (onFulfilled, onRejected) => {
        const result = isSingle 
          ? (items.length > 0 ? items[0] : null)
          : items;
        return Promise.resolve({ data: result, error: null }).then(onFulfilled, onRejected);
      }
    };

    return queryBuilder;
  };

  return {
    isMock: true,
    from: (table) => {
      return {
        select: (query = '*') => {
          return buildQuery(table);
        },
        insert: (rows) => {
          const items = JSON.parse(localStorage.getItem(`election_${table}`) || '[]');
          const toAdd = Array.isArray(rows) ? rows : [rows];
          const newItems = [...items, ...toAdd.map((r, i) => ({ id: items.length + i + 1, ...r }))];
          localStorage.setItem(`election_${table}`, JSON.stringify(newItems));
          return Promise.resolve({ data: toAdd, error: null });
        },
        update: (values) => {
          const items = JSON.parse(localStorage.getItem(`election_${table}`) || '[]');
          return {
            eq: (col, val) => {
              const updatedItems = items.map(item => {
                if (item[col] === val) return { ...item, ...values };
                return item;
              });
              localStorage.setItem(`election_${table}`, JSON.stringify(updatedItems));
              return Promise.resolve({ data: updatedItems.filter(item => item[col] === val), error: null });
            },
            neq: (col, val) => {
              const updatedItems = items.map(item => {
                if (item[col] !== val) return { ...item, ...values };
                return item;
              });
              localStorage.setItem(`election_${table}`, JSON.stringify(updatedItems));
              return Promise.resolve({ data: updatedItems.filter(item => item[col] !== val), error: null });
            }
          };
        },
        delete: () => {
          const items = JSON.parse(localStorage.getItem(`election_${table}`) || '[]');
          return {
            eq: (col, val) => {
              const remaining = items.filter(item => item[col] !== val);
              localStorage.setItem(`election_${table}`, JSON.stringify(remaining));
              return Promise.resolve({ data: null, error: null });
            },
            neq: (col, val) => {
              const remaining = items.filter(item => item[col] === val);
              localStorage.setItem(`election_${table}`, JSON.stringify(remaining));
              return Promise.resolve({ data: null, error: null });
            }
          };
        }
      };
    },
    rpc: (name, params) => {
      if (name === 'cast_ballot') {
        const tokens = JSON.parse(localStorage.getItem('election_tokens') || '[]');
        const cleanPin = params.input_pin.replace('-', '');
        const tokenIndex = tokens.findIndex(t => 
          (t.pin_code === params.input_pin || t.pin_code.replace('-', '') === cleanPin) && !t.is_used
        );

        if (tokenIndex === -1) {
          return Promise.resolve({
            data: { success: false, error: 'Invalid or already used PIN.' },
            error: null
          });
        }

        // Mark PIN as used
        tokens[tokenIndex].is_used = true;
        tokens[tokenIndex].used_at = new Date().toISOString();
        localStorage.setItem('election_tokens', JSON.stringify(tokens));

        // Insert votes
        const votes = JSON.parse(localStorage.getItem('election_votes') || '[]');
        if (params.spl_candidate_id) {
          votes.push({
            id: votes.length + 1,
            candidate_id: parseInt(params.spl_candidate_id),
            created_at: new Date().toISOString()
          });
        }
        if (params.aspl_candidate_id) {
          votes.push({
            id: votes.length + 1,
            candidate_id: parseInt(params.aspl_candidate_id),
            created_at: new Date().toISOString()
          });
        }
        localStorage.setItem('election_votes', JSON.stringify(votes));

        return Promise.resolve({
          data: { success: true },
          error: null
        });
      }
      return Promise.resolve({ data: null, error: { message: `Function ${name} not mocked.` } });
    }
  };
};

export const supabase = (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL')
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createMockClient();
