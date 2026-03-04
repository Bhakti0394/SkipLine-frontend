import { MenuItem, ChefStation } from '@/types/order';

export const menuItems: MenuItem[] = [
  { id: 'm1', name: 'Paneer Rice Bowl', prepTime: 12, category: 'Mains' },
  { id: 'm2', name: 'Butter Chicken', prepTime: 15, category: 'Mains' },
  { id: 'm3', name: 'Veg Hakka Noodles', prepTime: 10, category: 'Mains' },
  { id: 'm4', name: 'Fish Tikka Roll', prepTime: 8, category: 'Sushi' },
  { id: 'm5', name: 'Prawn Masala Roll', prepTime: 6, category: 'Sushi' },
  { id: 'm6', name: 'Fish Curry Bowl', prepTime: 8, category: 'Bowls' },
  { id: 'm7', name: 'Mutton Masala', prepTime: 14, category: 'Mains' },
  { id: 'm8', name: 'Pickle Fried Rice', prepTime: 10, category: 'Rice' },
  { id: 'm9', name: 'Rasam Soup', prepTime: 3, category: 'Sides' },
  { id: 'm10', name: 'Green Peas Fry', prepTime: 2, category: 'Sides' },
  { id: 'm11', name: 'Chicken Cutlet', prepTime: 8, category: 'Sides' },
  { id: 'm12', name: 'Masala Chai', prepTime: 1, category: 'Drinks' },
  { id: 'm13', name: 'Chicken Noodles', prepTime: 12, category: 'Mains' },
  { id: 'm14', name: 'Chicken Biryani', prepTime: 15, category: 'Mains' },
  { id: 'm15', name: 'Prawn Curry Roll', prepTime: 10, category: 'Sushi' },
];

export const customerNames = [
  'Aarav P.', 'Rohit K.', 'Sneha R.', 'Kunal T.', 'Pooja W.',
  'Rahul C.', 'Ananya P.', 'Suresh L.', 'Neha H.', 'Vikas B.',
  'Aditi S.', 'Manish N.', 'Ritika G.', 'Amit F.', 'Meena Y.',
  'Arjun W.', 'Kavya T.', 'Nikhil D.', 'Priya K.', 'Sanjay M.',
];

export const specialNotes = [
  'Extra paneer',
  'No onions',
  'Jain food',
  'Extra spicy',
  'No garlic',
  'Less salt',
  'Extra gravy',
  'Pure veg',
  null, null, null, null,
];

export const chefStations: ChefStation[] = [
  { id: 'chef1', name: 'Arjun Patel', avatar: 'AP', status: 'available', currentOrders: 0, completedToday: 12 },
  { id: 'chef2', name: 'Meera Iyer', avatar: 'MI', status: 'busy', currentOrders: 2, completedToday: 15 },
  { id: 'chef3', name: 'Rohit Sharma', avatar: 'RS', status: 'available', currentOrders: 1, completedToday: 10 },
  { id: 'chef4', name: 'Kiran Rao', avatar: 'KR', status: 'break', currentOrders: 0, completedToday: 8 },
];
