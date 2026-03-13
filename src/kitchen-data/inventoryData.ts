import { InventoryItem, MenuItemIngredients } from '../kitchen-types/inventory';

// ─── All items start above minThreshold so no alerts fire on page load ────────

export const initialInventory: InventoryItem[] = [
  // Proteins
  { id: 'inv1',  name: 'Paneer Cubes',          category: 'proteins',   currentStock: 55,  maxCapacity: 100, unit: 'lbs',     minThreshold: 20, criticalThreshold: 10, costPerUnit: 12.50, lastRestocked: new Date(), supplier: 'Amul Fresh' },
  { id: 'inv2',  name: 'Chicken Tikka Pieces',   category: 'proteins',   currentStock: 60,  maxCapacity: 120, unit: 'lbs',     minThreshold: 25, criticalThreshold: 12, costPerUnit: 5.50,  lastRestocked: new Date(), supplier: 'Farm Fresh Poultry' },
  { id: 'inv3',  name: 'Mutton Curry Cut',        category: 'proteins',   currentStock: 30,  maxCapacity: 80,  unit: 'lbs',     minThreshold: 15, criticalThreshold: 8,  costPerUnit: 18.00, lastRestocked: new Date(), supplier: 'Local Butcher' },
  { id: 'inv4',  name: 'Fish Fillet',             category: 'proteins',   currentStock: 25,  maxCapacity: 50,  unit: 'lbs',     minThreshold: 12, criticalThreshold: 5,  costPerUnit: 22.00, lastRestocked: new Date(), supplier: 'Coastal Catch' },
  { id: 'inv5',  name: 'Prawns',                  category: 'proteins',   currentStock: 30,  maxCapacity: 60,  unit: 'lbs',     minThreshold: 15, criticalThreshold: 8,  costPerUnit: 14.00, lastRestocked: new Date(), supplier: 'Coastal Catch' },
  { id: 'inv6',  name: 'Chicken Mince',           category: 'proteins',   currentStock: 20,  maxCapacity: 40,  unit: 'lbs',     minThreshold: 10, criticalThreshold: 5,  costPerUnit: 8.00,  lastRestocked: new Date(), supplier: 'Farm Fresh Poultry' },

  // Vegetables
  { id: 'inv7',  name: 'Tomato',                  category: 'vegetables', currentStock: 40,  maxCapacity: 100, unit: 'pcs',     minThreshold: 25, criticalThreshold: 10, costPerUnit: 1.50,  lastRestocked: new Date(), supplier: 'Green Mandai' },
  { id: 'inv8',  name: 'Onion',                   category: 'vegetables', currentStock: 55,  maxCapacity: 80,  unit: 'pcs',     minThreshold: 20, criticalThreshold: 10, costPerUnit: 0.75,  lastRestocked: new Date(), supplier: 'Green Mandai' },
  { id: 'inv9',  name: 'Green Peas',              category: 'vegetables', currentStock: 25,  maxCapacity: 50,  unit: 'lbs',     minThreshold: 12, criticalThreshold: 5,  costPerUnit: 4.00,  lastRestocked: new Date(), supplier: 'Green Mandai' },
  { id: 'inv10', name: 'Coriander Leaves',        category: 'vegetables', currentStock: 35,  maxCapacity: 60,  unit: 'bunches', minThreshold: 15, criticalThreshold: 8,  costPerUnit: 0.50,  lastRestocked: new Date(), supplier: 'Green Mandai' },
  { id: 'inv11', name: 'Mushrooms',               category: 'vegetables', currentStock: 20,  maxCapacity: 40,  unit: 'lbs',     minThreshold: 10, criticalThreshold: 5,  costPerUnit: 6.00,  lastRestocked: new Date(), supplier: 'Green Mandai' },
  { id: 'inv12', name: 'Mixed Pickle',            category: 'vegetables', currentStock: 25,  maxCapacity: 50,  unit: 'lbs',     minThreshold: 12, criticalThreshold: 5,  costPerUnit: 5.50,  lastRestocked: new Date(), supplier: 'Homestyle Foods' },

  // Grains
  { id: 'inv13', name: 'Basmati Rice',            category: 'grains',     currentStock: 80,  maxCapacity: 200, unit: 'lbs',     minThreshold: 40, criticalThreshold: 20, costPerUnit: 2.00,  lastRestocked: new Date(), supplier: 'India Grains' },
  { id: 'inv14', name: 'Wheat Noodles',           category: 'grains',     currentStock: 50,  maxCapacity: 100, unit: 'portions',minThreshold: 30, criticalThreshold: 15, costPerUnit: 0.80,  lastRestocked: new Date(), supplier: 'India Grains' },
  { id: 'inv15', name: 'Chapati Flour',           category: 'grains',     currentStock: 45,  maxCapacity: 80,  unit: 'portions',minThreshold: 20, criticalThreshold: 10, costPerUnit: 1.00,  lastRestocked: new Date(), supplier: 'India Grains' },

  // Sauces
  { id: 'inv16', name: 'Garam Masala Paste',      category: 'sauces',     currentStock: 15,  maxCapacity: 30,  unit: 'liters',  minThreshold: 8,  criticalThreshold: 4,  costPerUnit: 4.50,  lastRestocked: new Date(), supplier: 'Spice House' },
  { id: 'inv17', name: 'Butter Chicken Gravy',    category: 'sauces',     currentStock: 12,  maxCapacity: 25,  unit: 'liters',  minThreshold: 6,  criticalThreshold: 3,  costPerUnit: 6.00,  lastRestocked: new Date(), supplier: 'House Made' },
  { id: 'inv18', name: 'Mint Chutney',            category: 'sauces',     currentStock: 10,  maxCapacity: 20,  unit: 'liters',  minThreshold: 5,  criticalThreshold: 2,  costPerUnit: 5.00,  lastRestocked: new Date(), supplier: 'House Made' },
  { id: 'inv19', name: 'Dal Tadka Base',          category: 'sauces',     currentStock: 20,  maxCapacity: 50,  unit: 'liters',  minThreshold: 12, criticalThreshold: 6,  costPerUnit: 3.00,  lastRestocked: new Date(), supplier: 'House Made' },
  { id: 'inv20', name: 'Tamarind Paste',          category: 'sauces',     currentStock: 10,  maxCapacity: 25,  unit: 'lbs',     minThreshold: 6,  criticalThreshold: 3,  costPerUnit: 8.00,  lastRestocked: new Date(), supplier: 'Spice House' },

  // Dairy
  { id: 'inv21', name: 'Butter',                  category: 'dairy',      currentStock: 15,  maxCapacity: 30,  unit: 'lbs',     minThreshold: 8,  criticalThreshold: 4,  costPerUnit: 5.00,  lastRestocked: new Date(), supplier: 'Amul' },
  { id: 'inv22', name: 'Fresh Cream',             category: 'dairy',      currentStock: 10,  maxCapacity: 20,  unit: 'liters',  minThreshold: 5,  criticalThreshold: 2,  costPerUnit: 4.50,  lastRestocked: new Date(), supplier: 'Amul' },

  // Spices
  { id: 'inv23', name: 'Red Chilli Powder',       category: 'spices',     currentStock: 8,   maxCapacity: 15,  unit: 'lbs',     minThreshold: 4,  criticalThreshold: 2,  costPerUnit: 25.00, lastRestocked: new Date(), supplier: 'Spice House' },
  { id: 'inv24', name: 'Cumin Seeds',             category: 'spices',     currentStock: 8,   maxCapacity: 20,  unit: 'lbs',     minThreshold: 5,  criticalThreshold: 2,  costPerUnit: 8.00,  lastRestocked: new Date(), supplier: 'Spice House' },
  { id: 'inv25', name: 'Ginger',                  category: 'spices',     currentStock: 6,   maxCapacity: 15,  unit: 'lbs',     minThreshold: 4,  criticalThreshold: 2,  costPerUnit: 6.00,  lastRestocked: new Date(), supplier: 'Green Mandai' },

  // Beverages
  { id: 'inv26', name: 'Masala Chai',             category: 'beverages',  currentStock: 50,  maxCapacity: 100, unit: 'portions',minThreshold: 25, criticalThreshold: 10, costPerUnit: 0.30,  lastRestocked: new Date(), supplier: 'Tea Board India' },
  { id: 'inv27', name: 'Mango Lassi',             category: 'beverages',  currentStock: 20,  maxCapacity: 40,  unit: 'bottles', minThreshold: 10, criticalThreshold: 5,  costPerUnit: 15.00, lastRestocked: new Date(), supplier: 'House Made' },
];

// Menu mapping

export const menuIngredients: MenuItemIngredients[] = [
  { menuItemId: 'm1',  ingredients: [{ itemId: 'inv1',  quantity: 0.5  }, { itemId: 'inv13', quantity: 0.3  }, { itemId: 'inv7',  quantity: 0.5  }] },
  { menuItemId: 'm2',  ingredients: [{ itemId: 'inv2',  quantity: 0.4  }, { itemId: 'inv17', quantity: 0.1  }, { itemId: 'inv13', quantity: 0.3  }] },
  { menuItemId: 'm3',  ingredients: [{ itemId: 'inv14', quantity: 1    }, { itemId: 'inv19', quantity: 0.3  }, { itemId: 'inv11', quantity: 0.2  }] },
  { menuItemId: 'm4',  ingredients: [{ itemId: 'inv4',  quantity: 0.25 }, { itemId: 'inv13', quantity: 0.2  }, { itemId: 'inv18', quantity: 0.05 }] },
  { menuItemId: 'm5',  ingredients: [{ itemId: 'inv5',  quantity: 0.15 }, { itemId: 'inv7',  quantity: 0.5  }, { itemId: 'inv8',  quantity: 0.3  }] },
  { menuItemId: 'm6',  ingredients: [{ itemId: 'inv4',  quantity: 0.3  }, { itemId: 'inv7',  quantity: 0.5  }, { itemId: 'inv13', quantity: 0.25 }] },
  { menuItemId: 'm7',  ingredients: [{ itemId: 'inv3',  quantity: 0.4  }, { itemId: 'inv13', quantity: 0.3  }, { itemId: 'inv16', quantity: 0.05 }] },
  { menuItemId: 'm8',  ingredients: [{ itemId: 'inv13', quantity: 0.4  }, { itemId: 'inv12', quantity: 0.15 }, { itemId: 'inv10', quantity: 0.1  }] },
  { menuItemId: 'm9',  ingredients: [{ itemId: 'inv20', quantity: 0.05 }, { itemId: 'inv10', quantity: 0.1  }] },
  { menuItemId: 'm10', ingredients: [{ itemId: 'inv9',  quantity: 0.15 }] },
  { menuItemId: 'm11', ingredients: [{ itemId: 'inv6',  quantity: 0.1  }, { itemId: 'inv10', quantity: 0.05 }] },
  { menuItemId: 'm12', ingredients: [{ itemId: 'inv26', quantity: 1    }] },
  { menuItemId: 'm13', ingredients: [{ itemId: 'inv14', quantity: 1    }, { itemId: 'inv19', quantity: 0.4  }, { itemId: 'inv6',  quantity: 0.15 }] },
  { menuItemId: 'm14', ingredients: [{ itemId: 'inv2',  quantity: 0.35 }, { itemId: 'inv13', quantity: 0.35 }] },
  { menuItemId: 'm15', ingredients: [{ itemId: 'inv5',  quantity: 0.2  }, { itemId: 'inv7',  quantity: 0.5  }, { itemId: 'inv8',  quantity: 0.3  }] },
];