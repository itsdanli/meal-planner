/** Reviewed food identities shared by pantry tags, suggestions and grocery matching.
 * Preparation aliases do not imply that counts, package sizes or food forms convert.
 * Unrecognized names keep their exact identity; there is deliberately no fuzzy match.
 */
export const INGREDIENT_RULES_VERSION = 2;
export const normalizeIngredient = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ');

const groups: string[][] = [
  ['chicken breast', 'chicken breast (sliced)', 'chicken breast, thin-sliced'],
  ['dried rosemary'], ['tahini'], ['kimchi'],
  // Ingredients introduced by the expanded dinner, breakfast, and lunch catalog.
  ['apple', 'apples'], ['banana', 'bananas'], ['berries', 'mixed berries'],
  ['butter lettuce'], ['green cabbage'], ['kale'], ['frozen corn', 'corn kernels', 'frozen corn kernels'],
  ['frozen mixed vegetables'], ['brown lentils', 'dried brown lentils'],
  ['red lentils', 'dried red lentils'], ['french green lentils', 'puy lentils'],
  ['brown rice'], ['short-grain white rice'], ['quinoa'], ['couscous'],
  ['soba noodles'], ['rolled oats'], ['ditalini'], ['jumbo pasta shells'], ['shelf-stable gnocchi'],
  ['burger buns'], ['pita bread'], ['puff pastry'], ['walnuts'], ['chia seeds'],
  ['canned butter beans', 'butter beans'], ['crushed tomatoes'], ['marinara sauce'],
  ['capers'], ['balsamic vinegar'], ['red wine vinegar'], ['dijon mustard'],
  ['garam masala'], ['dried thyme'], ['miso paste'], ['salsa'], ['hummus'],
  ['prepared falafel'], ['mayonnaise'], ['cottage cheese'], ['paneer'], ['ricotta'],
  ['firm tofu'], ['maple syrup'],
  ['heavy cream'], ['chicken'], ['rice vinegar'], ['jasmine rice', 'white jasmine rice'], ['basmati rice'],
  ['spaghetti'], ['tomato paste'], ['brown sugar'], ['sugar'], ['honey'],
  ['smoked paprika'], ['chili powder'], ['curry powder'], ['diced tomatoes (14oz can)'],
  ['garlic', 'garlic cloves', 'garlic clove', 'garlic clove, minced', 'garlic cloves, minced', 'garlic cloves, sliced', 'garlic cloves, thinly sliced', 'garlic cloves, coarsely chopped'],
  ['yellow onion', 'onion', 'onions', 'yellow onion, diced', 'yellow onion, finely diced', 'yellow onion, sliced', 'small yellow onion, diced', 'large yellow onion', 'large yellow onion, diced', 'large yellow onion, finely diced', 'large yellow onion, sliced', 'large yellow onion, diced (about 1½ cups)'],
  ['red onion', 'red onion, chopped'],
  ['green onions', 'scallions', 'scallions, sliced', 'green onions, sliced', 'green onions, sliced thin', 'green onions, thinly sliced', 'green onions, sliced (white and green parts separated)'],
  ['shallots', 'shallot', 'shallots, thinly sliced'],
  ['ginger', 'fresh ginger', 'fresh ginger, grated', 'fresh ginger, finely grated'],
  ['carrots', 'carrot', 'carrots, thinly sliced', 'medium carrots, diced', 'medium carrots, finely diced', 'shredded carrots'],
  ['spinach', 'baby spinach'],
  ['cilantro', 'fresh cilantro', 'fresh cilantro (optional)', 'fresh cilantro, for serving'],
  ['parsley', 'fresh parsley, chopped', 'fresh flat-leaf parsley, chopped'],
  ['basil', 'fresh basil', 'fresh basil, torn'],
  ['dill', 'fresh dill', 'fresh dill, chopped'],
  ['mint', 'fresh mint'],
  ['red bell pepper', 'red bell pepper, diced', 'red bell pepper, sliced', 'red bell pepper, thinly sliced', 'medium red bell pepper, diced (about 1 cup)'],
  ['green bell pepper', 'green bell pepper, diced', 'green bell pepper, sliced'],
  ['cherry tomatoes', 'cherry tomatoes, halved'],
  ['avocado', 'avocado, diced', 'avocado, sliced'],
  ['broccoli', 'broccoli florets', 'broccoli florets, chopped small'],
  ['english cucumber', 'cucumber', 'english cucumber, diced', 'english cucumber, thinly sliced', 'english cucumber, julienned or thinly sliced'],
  ['zucchini', 'zucchini, sliced into half-moons', 'medium zucchini, sliced into half-moons'],
  ['cremini mushrooms', 'cremini mushrooms, sliced'],
  ['asparagus', 'asparagus, trimmed and cut into 1-inch pieces', 'asparagus, trimmed and sliced on diagonal into 1-inch pieces'],
  ['cauliflower', 'cauliflower, cut into small florets'],
  ['celery', 'celery stalks, diced', 'celery stalks, finely diced'],
  ['jalapeño', 'jalapeno', 'jalapeño, seeded and diced'],
  ['eggplant', 'medium eggplant, cut into ¾-inch cubes'],
  ['sweet potato', 'sweet potato, peeled and cubed (½-inch)'],
  ['russet potatoes', 'large russet potatoes'],
  ['yukon gold potatoes', 'yukon gold potatoes, diced (½-inch)'],
  ['red cabbage', 'shredded red cabbage'],
  ['snap peas', 'snap peas, trimmed'],
  ['eggs', 'egg', 'large eggs'],
  ['unsalted butter', 'butter'],
  ['whole milk', 'milk'],
  ['greek yogurt', 'plain greek yogurt'],
  ['parmesan', 'grated parmesan', 'finely grated parmesan, plus more to serve', 'grated parmesan, plus more to serve', 'grated parmesan, plus more for serving'],
  ['feta', 'crumbled feta', 'crumbled feta (optional)', 'crumbled feta cheese'],
  ['cheddar', 'sharp cheddar, shredded', 'shredded cheddar cheese, for topping', 'shredded sharp cheddar cheese'],
  ['monterey jack cheese', 'monterey jack cheese, shredded', 'shredded monterey jack cheese'],
  ['fresh mozzarella', 'fresh mozzarella, torn into pieces'],
  ['silken tofu', 'silken tofu (14oz block), cubed'],
  ['frozen peas', 'frozen peas, thawed'],
  ['frozen edamame', 'frozen shelled edamame, thawed'],
  ['olive oil', 'extra-virgin olive oil', 'olive oil (for frying and sauce)', 'olive oil, plus more to finish'],
  ['neutral oil', 'neutral oil (vegetable or avocado)'],
  ['toasted sesame oil', 'sesame oil'],
  ['soy sauce', 'low-sodium soy sauce'],
  ['vegetable broth', 'low-sodium vegetable broth'],
  ['canned black beans', 'black beans (15oz can)', 'black beans (15oz can), drained and rinsed', 'black beans (15oz can, liquid reserved)'],
  ['canned chickpeas', 'chickpeas (15oz can)', 'chickpeas (15oz can), drained and rinsed'],
  ['canned cannellini beans', 'cannellini beans (15oz can)', 'cannellini beans (15oz can), drained and rinsed'],
  ['canned kidney beans', 'kidney beans (15oz can)', 'kidney beans (15oz can), drained and rinsed'],
  ['canned pinto beans', 'pinto beans (15oz can)', 'pinto beans (15oz can), drained and rinsed'],
  ['full-fat coconut milk', 'full-fat coconut milk (13.5oz can)'],
  ['peanut butter', 'natural creamy peanut butter'],
  ['corn tortillas', 'corn tortillas (6-inch)'],
  ['flour tortillas', 'flour tortillas (8-inch)'],
  ['all-purpose flour', 'flour'],
  ['red pepper flakes', 'crushed red pepper flakes', 'dried red chili flakes, for serving'],
  ['cumin', 'ground cumin'],
  ['dried oregano', 'oregano'],
  ['cinnamon', 'ground cinnamon'],
  ['ground coriander', 'coriander powder'],
  ['ground turmeric', 'turmeric'],
  ['sesame seeds', 'toasted sesame seeds'],
  ['kosher salt', 'salt'],
  ['black pepper', 'pepper'],
  ['water', 'water (to rinse can)'],
  ['sour cream', 'sour cream, for serving', 'sour cream, for topping'],
  ['sriracha', 'sriracha hot sauce'],
  ['kalamata olives', 'kalamata olives, pitted and halved', 'kalamata olives, sliced', 'pitted kalamata olives, halved'],
  ['hot sauce', 'hot sauce (optional)', 'hot sauce (such as cholula)'],
  ['harissa paste', 'harissa paste (optional but recommended)'],
  ['gochujang', 'gochujang (korean chili paste)'],
  ['orzo', 'orzo pasta'],
  ['penne', 'penne, dry'],
  ['elbow macaroni', 'elbow macaroni, dry'],
  ['rice noodles', 'rice noodles (pad thai-style, 8oz)', 'flat rice noodles (pad thai-style, 8oz)'],
  ['bread', 'crusty bread', 'crusty bread, for serving'],
  ['lemon', 'lemons', 'lemon (zest and juice)', 'lemon, zested and juiced'],
  ['lime', 'limes', 'fresh lime wedges, for serving'],
  ['lemon juice', 'fresh lemon juice', 'fresh lemon juice (1 large lemon)', 'fresh lemon juice (½ medium lemon)', 'lemon, juiced'],
  ['lime juice', 'fresh lime juice', 'fresh lime juice (2 limes)', 'lime, juiced'],
];

export interface CatalogIngredient { id: string; name: string; aliases: string[] }
export const ingredientCatalog: CatalogIngredient[] = groups.map(([name, ...aliases]) => ({
  id: `food:${name.replace(/[^a-z0-9]+/g, '-').replace(/-$/, '')}`, name, aliases,
}));
const byName = new Map(ingredientCatalog.flatMap(item => [item.name, ...item.aliases].map(name => [normalizeIngredient(name), item] as const)));
export function ingredientIdentity(name: string): string {
  const normalized = normalizeIngredient(name);
  return byName.get(normalized)?.id ?? `custom:${normalized}`;
}
export function ingredientLabel(name: string): string { return byName.get(normalizeIngredient(name))?.name ?? name.trim(); }
export function sameIngredient(left: string, right: string): boolean {
  return !!left.trim() && !!right.trim() && ingredientIdentity(left) === ingredientIdentity(right);
}

// Only explicit recipe alternatives. Arbitrary "or" in preparation instructions
// (e.g. "julienned or thinly sliced") must not split into separate foods.
const choices: Record<string, string[]> = {
  'low-sodium soy sauce or tamari': ['soy sauce', 'tamari'],
  'soy sauce or tamari': ['soy sauce', 'tamari'],
  'avocado oil or olive oil': ['avocado oil', 'olive oil'],
  'olive oil or avocado oil': ['olive oil', 'avocado oil'],
  'coconut oil or neutral oil': ['coconut oil', 'neutral oil'],
  'basmati or jasmine rice': ['basmati rice', 'jasmine rice'],
  'jasmine or short-grain white rice': ['jasmine rice', 'short-grain white rice'],
  'brown sugar or palm sugar': ['brown sugar', 'palm sugar'],
  'plain greek yogurt or sour cream': ['greek yogurt', 'sour cream'],
  'sour cream or greek yogurt': ['sour cream', 'greek yogurt'],
  'sour cream or greek yogurt, for serving': ['sour cream', 'greek yogurt'],
  'fresh cilantro or basil, for serving': ['cilantro', 'basil'],
  'fresh basil or flat-leaf parsley': ['basil', 'parsley'],
  'fresh cilantro or flat-leaf parsley, chopped': ['cilantro', 'parsley'],
  'fresh dill or parsley, chopped': ['dill', 'parsley'],
  'honey or agave syrup': ['honey', 'agave syrup'],
  'maple syrup or honey': ['maple syrup', 'honey'],
  'penne or fusilli, dry': ['penne', 'fusilli'],
  'rigatoni or penne, dry': ['rigatoni', 'penne'],
  'spaghetti or fusilli, dry': ['spaghetti', 'fusilli'],
  'spaghetti or linguine, dry': ['spaghetti', 'linguine'],
  'spaghetti or penne': ['spaghetti', 'penne'],
  'short pasta (rigatoni, penne, or fusilli)': ['rigatoni', 'penne', 'fusilli'],
  'pappardelle or fettuccine, dry': ['pappardelle', 'fettuccine'],
  'ditalini or small shell pasta': ['ditalini', 'small shell pasta'],
  'ditalini or small shell pasta, dry': ['ditalini', 'small shell pasta'],
  'fajita or taco seasoning': ['fajita seasoning', 'taco seasoning'],
};
export function ingredientOptions(name: string): string[] {
  return choices[normalizeIngredient(name)] ?? [name];
}
export function pantryMatches(pantryName: string, requiredName: string): boolean {
  return ingredientOptions(requiredName).some(option => sameIngredient(pantryName, option));
}
export const isOptionalIngredient = (name: string) => /\(optional(?: but recommended)?\)/i.test(name);
export function searchIngredients(query: string): CatalogIngredient[] {
  const needle = normalizeIngredient(query);
  if (!needle) return [];
  return ingredientCatalog.filter(item => [item.name, ...item.aliases].some(alias => alias.includes(needle))).slice(0, 12);
}

// Multiple foods in one recipe line are separate requirements, not aliases.
const combinations: Record<string, string[]> = {
  'kosher salt and black pepper': ['kosher salt', 'black pepper'],
  'fresh mint and cilantro': ['fresh mint', 'cilantro'],
  'fresh cilantro and lime, for topping': ['cilantro', 'lime'],
};
export function ingredientParts(name: string): string[] { return combinations[normalizeIngredient(name)] ?? [name]; }
export function pantryContributes(pantryName: string, requiredName: string): boolean {
  return ingredientParts(requiredName).some(part => pantryMatches(pantryName, part));
}
