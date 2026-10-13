"""
Seeds the shared food catalogue (owner_user_id NULL). Idempotent: upserts by
(name, brand), so it is safe to run on every deploy.

    python -m app.seed_foods

Values are per 100 g and hand-curated from commonly published reference
figures (USDA FoodData Central style for basic ingredients). Prepared dishes,
especially Indian home-cooked ones, vary a lot by recipe, so those carry
is_approx=True and the app labels them "approx". This is the starter
catalogue; a bulk USDA/Open Food Facts import can extend the same table later
without changing the API.
"""
from uuid import uuid4

from .database import SessionLocal
from .models import Food

CATALOGUE = []


def f(name, kcal, p, c, fat, fiber=0, sugar=0, na=0, serving=100, label="", approx=False):
    """One food, nutrients per 100 g. `serving` is the typical portion in grams."""
    CATALOGUE.append((name, kcal, p, c, fat, fiber, sugar, na, serving, label, approx))


# --- Poultry, eggs, fish, meat ---
f("Chicken breast, raw", 120, 22.5, 0, 2.6, 0, 0, 45)
f("Chicken breast, cooked (grilled)", 165, 31, 0, 3.6, 0, 0, 74, 120, "1 breast")
f("Chicken thigh, cooked (skinless)", 209, 26, 0, 10.9, 0, 0, 95)
f("Chicken drumstick, cooked (skinless)", 175, 28, 0, 5.7, 0, 0, 90, 100, "1 drumstick")
f("Chicken wings, cooked (with skin)", 290, 27, 0, 19, 0, 0, 100)
f("Chicken curry", 150, 13, 4, 9, 1, 1.5, 380, 200, "1 bowl", True)
f("Butter chicken", 150, 11, 6, 9, 1, 3, 420, 200, "1 bowl", True)
f("Tandoori chicken", 150, 20, 3, 6, 0.5, 1, 400, 120, "2 pieces", True)
f("Chicken biryani", 160, 9, 20, 5, 1, 1, 380, 250, "1 plate", True)
f("Chicken 65", 250, 18, 12, 14, 1, 1, 600, 100, "", True)
f("Egg, whole (raw)", 143, 12.6, 0.7, 9.5, 0, 0.4, 142, 50, "1 large egg")
f("Egg, boiled", 155, 12.6, 1.1, 10.6, 0, 1.1, 124, 50, "1 large egg")
f("Egg white", 52, 10.9, 0.7, 0.2, 0, 0.7, 166, 33, "1 egg white")
f("Omelette (2 eggs)", 154, 10.6, 0.6, 11.7, 0, 0.6, 155, 110, "1 omelette", True)
f("Egg curry", 125, 8, 4, 8, 1, 2, 360, 200, "1 bowl", True)
f("Salmon, cooked", 206, 22, 0, 12, 0, 0, 61, 120, "1 fillet")
f("Salmon, raw", 208, 20, 0, 13, 0, 0, 59)
f("Tuna, canned in water", 116, 25.5, 0, 0.8, 0, 0, 247, 100, "1 small can")
f("Tilapia, cooked", 128, 26, 0, 2.7, 0, 0, 56)
f("Cod, cooked", 105, 23, 0, 0.9, 0, 0, 78)
f("Rohu fish, raw", 97, 16.6, 0, 1.4, 0, 0, 60)
f("Prawns, cooked", 99, 24, 0.2, 0.3, 0, 0, 111)
f("Sardines, canned", 208, 25, 0, 11, 0, 0, 307)
f("Fish curry", 120, 11, 3, 7, 0.5, 1, 360, 200, "1 bowl", True)
f("Beef, ground 90% lean, cooked", 217, 26, 0, 12, 0, 0, 72)
f("Beef steak, sirloin, cooked", 206, 29, 0, 9, 0, 0, 60)
f("Mutton (goat), cooked", 143, 27, 0, 3, 0, 0, 86)
f("Lamb, cooked", 258, 25, 0, 17, 0, 0, 72)
f("Mutton curry", 180, 14, 4, 12, 1, 1.5, 400, 200, "1 bowl", True)
f("Keema (minced mutton curry)", 190, 15, 4, 13, 1, 1.5, 420, 150, "1 bowl", True)
f("Bacon, cooked", 541, 37, 1.4, 42, 0, 0, 1717)
f("Whey protein powder", 400, 80, 8, 6, 0, 4, 200, 30, "1 scoop", True)

# --- Dairy and alternatives ---
f("Milk, whole", 61, 3.2, 4.8, 3.3, 0, 5, 43, 244, "1 cup")
f("Milk, toned (3% fat)", 58, 3.0, 4.7, 3.0, 0, 4.7, 44, 244, "1 cup", True)
f("Milk, skimmed", 34, 3.4, 5, 0.1, 0, 5, 42, 244, "1 cup")
f("Curd / dahi (whole milk)", 61, 3.5, 4.7, 3.3, 0, 4.7, 46, 100, "1 small bowl")
f("Greek yogurt, plain, nonfat", 59, 10.3, 3.6, 0.4, 0, 3.2, 36, 170, "1 cup")
f("Buttermilk (chaas)", 40, 3.3, 4.8, 0.9, 0, 4.8, 105, 200, "1 glass")
f("Paneer", 265, 18, 1.2, 21, 0, 0, 22, 50, "50 g slice", True)
f("Cottage cheese", 98, 11, 3.4, 4.3, 0, 2.7, 364)
f("Cheese, cheddar", 403, 25, 1.3, 33, 0, 0.5, 621, 28, "1 slice")
f("Cheese, mozzarella", 280, 28, 3.1, 17, 0, 1, 627, 28, "1 slice")
f("Butter", 717, 0.9, 0.1, 81, 0, 0.1, 11, 10, "1 tsp")
f("Ghee", 900, 0, 0, 100, 0, 0, 2, 10, "1 tsp")
f("Lassi, sweet", 70, 2.5, 11, 2, 0, 10, 40, 250, "1 glass", True)
f("Ice cream, vanilla", 207, 3.5, 24, 11, 0.7, 21, 80, 66, "1 scoop")
f("Tofu, firm", 144, 17, 3, 9, 2, 0.6, 14)
f("Tempeh", 192, 20, 7.6, 11, 0, 0, 9)
f("Soya chunks, dry", 345, 52, 33, 0.5, 13, 0, 20, 30, "1 handful", True)
f("Soy milk, unsweetened", 33, 2.9, 1.7, 1.6, 0.5, 0.4, 51, 244, "1 cup")
f("Almond milk, unsweetened", 15, 0.6, 0.3, 1.2, 0, 0, 72, 244, "1 cup")

# --- Grains, breads, breakfast ---
f("White rice, cooked", 130, 2.7, 28, 0.3, 0.4, 0, 1, 150, "1 cup")
f("Brown rice, cooked", 112, 2.3, 23.5, 0.8, 1.8, 0.4, 5, 150, "1 cup")
f("Basmati rice, cooked", 130, 2.7, 28, 0.3, 0.4, 0, 1, 150, "1 cup", True)
f("White rice, raw", 365, 7.1, 80, 0.7, 1.3, 0.1, 5)
f("Roti / chapati", 300, 9.5, 49, 7, 4, 1, 250, 40, "1 roti", True)
f("Phulka (no oil)", 265, 9, 52, 3.7, 4, 1, 230, 30, "1 phulka", True)
f("Paratha, plain", 326, 7.7, 44, 13, 3, 1, 380, 80, "1 paratha", True)
f("Aloo paratha", 262, 5.8, 36, 10, 3, 1.5, 400, 100, "1 paratha", True)
f("Naan", 290, 9, 50, 5, 2, 3, 520, 90, "1 naan")
f("Poori", 340, 7.5, 44, 15, 2, 1, 280, 30, "1 poori", True)
f("Bread, white", 265, 9, 49, 3.2, 2.7, 5, 491, 30, "1 slice")
f("Bread, whole wheat", 247, 13, 41, 3.4, 7, 6, 450, 30, "1 slice")
f("Pav (bread roll)", 285, 8, 52, 4, 2, 5, 480, 40, "1 pav", True)
f("Oats, rolled (dry)", 379, 13.2, 67.7, 6.5, 10.1, 1, 6, 40, "1/2 cup")
f("Oats, cooked in water", 71, 2.5, 12, 1.5, 1.7, 0.3, 4, 240, "1 bowl")
f("Muesli", 340, 9.7, 66, 5.9, 7.3, 18, 26, 50, "1/2 cup", True)
f("Cornflakes", 357, 7.5, 84, 0.4, 3.3, 10, 729, 30, "1 cup")
f("Poha, cooked", 130, 2.8, 22, 3.5, 1.5, 1, 260, 150, "1 plate", True)
f("Poha, raw (flattened rice)", 346, 6.6, 77, 1.2, 2, 1, 10)
f("Upma", 150, 3.5, 22, 5, 1.5, 1, 330, 150, "1 plate", True)
f("Idli", 146, 4.5, 29, 0.6, 1.2, 0.5, 190, 40, "1 idli", True)
f("Dosa, plain", 168, 3.9, 29, 3.7, 1.2, 0.5, 220, 80, "1 dosa", True)
f("Masala dosa", 190, 4, 30, 6, 2, 1, 330, 150, "1 dosa", True)
f("Uttapam", 180, 5, 28, 5, 2, 1, 300, 100, "1 uttapam", True)
f("Medu vada", 290, 10, 30, 15, 3, 1, 450, 40, "1 vada", True)
f("Sambar", 55, 3, 8, 1.5, 2, 2, 320, 150, "1 katori", True)
f("Coconut chutney", 160, 2, 7, 14, 3, 2, 300, 30, "2 tbsp", True)
f("Pasta, cooked", 158, 5.8, 31, 0.9, 1.8, 0.6, 1, 140, "1 cup")
f("Pasta, dry", 371, 13, 75, 1.5, 3.2, 2.7, 6)
f("Noodles, hakka (cooked)", 138, 4.5, 25, 2.1, 1.2, 0.5, 280, 200, "1 plate", True)
f("Instant noodles, dry", 450, 9, 62, 18, 2.5, 2, 1800, 70, "1 packet", True)
f("Potato, boiled", 87, 1.9, 20, 0.1, 1.8, 0.9, 5, 150, "1 medium")
f("Potato, raw", 77, 2, 17, 0.1, 2.2, 0.8, 6)
f("Sweet potato, boiled", 90, 2, 20.7, 0.2, 3.3, 6.5, 36, 130, "1 medium")
f("French fries", 312, 3.4, 41, 15, 3.8, 0.3, 210, 100, "1 serving")
f("Quinoa, cooked", 120, 4.4, 21.3, 1.9, 2.8, 0.9, 7, 185, "1 cup")
f("Couscous, cooked", 112, 3.8, 23, 0.2, 1.4, 0.1, 5)
f("Bajra (pearl millet), raw", 361, 11.6, 67.5, 5, 11.5, 1, 5)
f("Ragi (finger millet), raw", 336, 7.3, 72, 1.3, 11.5, 1, 11)
f("Jowar (sorghum), raw", 349, 10.4, 72.6, 1.9, 9.7, 2, 6)
f("Besan (gram flour)", 387, 22, 58, 6.7, 11, 11, 64)
f("Wheat flour (atta), whole", 340, 13.2, 72, 2.5, 10.7, 0.4, 2)
f("Maida (refined flour)", 364, 10, 76, 1, 2.7, 0.3, 2)
f("Semolina (rava)", 360, 12.7, 73, 1.1, 3.9, 2, 1)
f("Khichdi (dal rice)", 120, 4.5, 20, 2.5, 2, 0.5, 280, 250, "1 bowl", True)
f("Curd rice", 125, 3.5, 20, 3, 0.5, 2, 250, 250, "1 bowl", True)
f("Lemon rice", 160, 3, 28, 4, 1, 0.5, 300, 200, "1 plate", True)
f("Fried rice, veg", 163, 4, 26, 4.5, 1.5, 1, 450, 250, "1 plate", True)
f("Dhokla", 160, 6, 25, 4, 2, 4, 400, 100, "4 pieces", True)

# --- Legumes ---
f("Toor dal, raw", 343, 22, 62, 1.5, 15, 3, 17)
f("Moong dal, raw", 347, 24, 63, 1.2, 16, 7, 15)
f("Masoor dal, raw", 352, 24.6, 63, 1.1, 11, 2, 6)
f("Chana dal, raw", 364, 20, 61, 5.6, 17, 6, 24)
f("Urad dal, raw", 341, 25, 59, 1.6, 18, 2, 38)
f("Lentils, cooked", 116, 9, 20, 0.4, 7.9, 1.8, 2, 200, "1 cup")
f("Dal tadka", 105, 6, 14, 3, 3, 1.5, 300, 200, "1 bowl", True)
f("Dal makhani", 130, 6, 13, 6, 4, 2, 340, 200, "1 bowl", True)
f("Rajma, cooked", 127, 8.7, 22.8, 0.5, 6.4, 0.3, 1, 180, "1 cup")
f("Rajma masala", 120, 6, 16, 4, 5, 2, 330, 200, "1 bowl", True)
f("Chickpeas (chana), cooked", 164, 8.9, 27.4, 2.6, 7.6, 4.8, 7, 160, "1 cup")
f("Chole masala", 140, 7, 18, 5, 5, 3, 360, 200, "1 bowl", True)
f("Black beans, cooked", 132, 8.9, 23.7, 0.5, 8.7, 0.3, 1, 170, "1 cup")
f("Moong sprouts", 30, 3, 6, 0.2, 1.8, 4, 6, 100, "1 cup")
f("Peanuts, roasted", 585, 23.7, 21.5, 49.7, 8, 4.2, 6, 30, "1 handful")
f("Peanut butter", 588, 25, 20, 50, 6, 9, 459, 16, "1 tbsp")
f("Roasted chana", 364, 19, 60, 5, 17, 6, 70, 30, "1 handful", True)

# --- Nuts, seeds, dried fruit ---
f("Almonds", 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1, 28, "10 almonds")
f("Cashews", 553, 18.2, 30.2, 43.9, 3.3, 5.9, 12, 28, "10 cashews")
f("Walnuts", 654, 15.2, 13.7, 65.2, 6.7, 2.6, 2, 28, "4 halves")
f("Pistachios", 560, 20.2, 27.2, 45.3, 10.6, 7.7, 1, 28, "1 handful")
f("Chia seeds", 486, 16.5, 42.1, 30.7, 34.4, 0, 16, 15, "1 tbsp")
f("Flax seeds", 534, 18.3, 28.9, 42.2, 27.3, 1.6, 30, 10, "1 tbsp")
f("Sunflower seeds", 584, 20.8, 20, 51.5, 8.6, 2.6, 9, 28, "1 handful")
f("Pumpkin seeds", 559, 30, 10.7, 49, 6, 1.4, 7, 28, "1 handful")
f("Dates, medjool", 277, 1.8, 75, 0.2, 6.7, 66, 1, 24, "1 date")
f("Raisins", 299, 3.1, 79, 0.5, 3.7, 59, 11, 28, "1 small box")
f("Coconut, fresh", 354, 3.3, 15.2, 33.5, 9, 6.2, 20)

# --- Fruit ---
f("Apple", 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1, 180, "1 medium")
f("Banana", 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1, 118, "1 medium")
f("Orange", 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0, 130, "1 medium")
f("Mango", 60, 0.8, 15, 0.4, 1.6, 13.7, 1, 165, "1 cup sliced")
f("Grapes", 69, 0.7, 18.1, 0.2, 0.9, 15.5, 2, 150, "1 cup")
f("Watermelon", 30, 0.6, 7.6, 0.2, 0.4, 6.2, 1, 280, "1 wedge")
f("Papaya", 43, 0.5, 10.8, 0.3, 1.7, 7.8, 8, 150, "1 cup")
f("Pineapple", 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1, 165, "1 cup")
f("Guava", 68, 2.6, 14.3, 1, 5.4, 8.9, 2, 100, "1 guava")
f("Pomegranate", 83, 1.7, 18.7, 1.2, 4, 13.7, 3, 100, "1/2 cup seeds")
f("Strawberries", 32, 0.7, 7.7, 0.3, 2, 4.9, 1, 150, "1 cup")
f("Blueberries", 57, 0.7, 14.5, 0.3, 2.4, 10, 1, 148, "1 cup")
f("Kiwi", 61, 1.1, 14.7, 0.5, 3, 9, 3, 70, "1 kiwi")
f("Pear", 57, 0.4, 15.2, 0.1, 3.1, 9.8, 1, 180, "1 medium")
f("Chikoo (sapota)", 83, 0.4, 20, 1.1, 5.3, 14, 12, 100, "1 chikoo", True)
f("Avocado", 160, 2, 8.5, 14.7, 6.7, 0.7, 7, 100, "1/2 avocado")
f("Coconut water", 19, 0.7, 3.7, 0.2, 1.1, 2.6, 105, 240, "1 glass")

# --- Vegetables ---
f("Broccoli", 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33)
f("Spinach", 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79)
f("Carrot", 41, 0.9, 9.6, 0.2, 2.8, 4.7, 69, 60, "1 medium")
f("Tomato", 18, 0.9, 3.9, 0.2, 1.2, 2.6, 5, 120, "1 medium")
f("Onion", 40, 1.1, 9.3, 0.1, 1.7, 4.2, 4, 110, "1 medium")
f("Cucumber", 15, 0.7, 3.6, 0.1, 0.5, 1.7, 2, 100, "1/2 cucumber")
f("Cauliflower", 25, 1.9, 5, 0.3, 2, 1.9, 30)
f("Cabbage", 25, 1.3, 5.8, 0.1, 2.5, 3.2, 18)
f("Capsicum (bell pepper)", 31, 1, 6, 0.3, 2.1, 4.2, 4)
f("Green peas", 81, 5.4, 14.5, 0.4, 5.7, 5.7, 5, 80, "1/2 cup")
f("Okra (bhindi)", 33, 1.9, 7.5, 0.2, 3.2, 1.5, 7)
f("Brinjal (eggplant)", 25, 1, 5.9, 0.2, 3, 3.5, 2)
f("Beetroot", 43, 1.6, 9.6, 0.2, 2.8, 6.8, 78)
f("Mushrooms", 22, 3.1, 3.3, 0.3, 1, 2, 5)
f("Sweet corn", 86, 3.3, 19, 1.4, 2, 6.3, 15, 90, "1/2 cup")
f("Bottle gourd (lauki)", 14, 0.6, 3.4, 0, 0.5, 2.5, 2, 100, "", True)
f("Bitter gourd (karela)", 17, 1, 3.7, 0.2, 2.8, 1, 5)
f("Palak paneer", 150, 7, 5, 11, 2, 2, 380, 200, "1 bowl", True)
f("Paneer butter masala", 210, 8, 8, 16, 1, 4, 420, 200, "1 bowl", True)
f("Aloo gobi", 100, 2.5, 12, 5, 2.5, 2, 330, 200, "1 bowl", True)
f("Mixed vegetable curry", 90, 2.5, 10, 4.5, 2.5, 3, 320, 200, "1 bowl", True)
f("Mixed green salad", 20, 1.3, 3.5, 0.2, 1.8, 1.7, 25, 100, "1 bowl", True)

# --- Fats, sweeteners ---
f("Olive oil", 884, 0, 0, 100, 0, 0, 2, 14, "1 tbsp")
f("Coconut oil", 892, 0, 0, 99, 0, 0, 0, 14, "1 tbsp")
f("Mustard oil", 884, 0, 0, 100, 0, 0, 0, 14, "1 tbsp")
f("Sunflower oil", 884, 0, 0, 100, 0, 0, 0, 14, "1 tbsp")
f("Sugar", 387, 0, 100, 0, 0, 100, 1, 4, "1 tsp")
f("Honey", 304, 0.3, 82, 0, 0.2, 82, 4, 21, "1 tbsp")
f("Jaggery", 383, 0.4, 98, 0.1, 0, 85, 20, 10, "1 piece", True)

# --- Drinks ---
f("Tea with milk and sugar (chai)", 45, 1.2, 6.5, 1.8, 0, 6, 15, 150, "1 cup", True)
f("Coffee, black", 1, 0.1, 0, 0, 0, 0, 2, 240, "1 cup")
f("Coffee with milk and sugar", 50, 1.5, 7, 1.8, 0, 6.5, 20, 150, "1 cup", True)
f("Cola", 42, 0, 10.6, 0, 0, 10.6, 4, 330, "1 can")
f("Orange juice", 45, 0.7, 10.4, 0.2, 0.2, 8.4, 1, 250, "1 glass")
f("Beer", 43, 0.5, 3.6, 0, 0, 0, 4, 330, "1 bottle")

# --- Snacks, sweets, fast food ---
f("Biscuit (Marie)", 430, 8, 75, 11, 2, 22, 400, 24, "4 biscuits", True)
f("Digestive biscuit", 486, 7, 62, 22, 3, 17, 600, 30, "2 biscuits", True)
f("Samosa", 262, 3.5, 24, 17, 2, 1.5, 420, 60, "1 samosa", True)
f("Pakora (mixed veg)", 300, 7, 28, 18, 3, 2, 480, 60, "4 pieces", True)
f("Potato chips", 536, 7, 53, 35, 4.4, 0.3, 525, 28, "1 small pack")
f("Chocolate, dark (70-85%)", 598, 7.8, 46, 43, 11, 24, 20, 20, "2 squares")
f("Chocolate, milk", 535, 7.7, 59, 30, 3.4, 52, 79, 20, "2 squares")
f("Gulab jamun", 330, 5, 50, 12, 0.5, 38, 60, 40, "1 piece", True)
f("Rasgulla", 186, 4.5, 38, 1.5, 0, 33, 40, 50, "1 piece", True)
f("Jalebi", 375, 2.5, 60, 14, 0.5, 40, 20, 30, "1 piece", True)
f("Besan laddu", 480, 9, 55, 25, 3, 30, 20, 40, "1 laddu", True)
f("Kheer", 130, 3.5, 20, 4, 0.2, 16, 50, 150, "1 katori", True)
f("Suji halwa", 320, 4, 45, 14, 1, 28, 40, 100, "1 katori", True)
f("Pizza, cheese (slice)", 266, 11, 33, 10, 2.3, 3.6, 598, 107, "1 slice")
f("Burger, chicken (fast food)", 255, 14, 27, 10, 1.5, 5, 600, 180, "1 burger", True)
f("Vada pav", 290, 7, 40, 11, 3, 3, 520, 120, "1 vada pav", True)
f("Protein bar (generic)", 380, 30, 35, 12, 5, 12, 200, 60, "1 bar", True)


def seed() -> tuple[int, int]:
    """Upserts the catalogue; returns (created, updated)."""
    created = updated = 0
    with SessionLocal() as db:
        existing = {
            (food.name, food.brand): food for food in db.query(Food).filter(Food.owner_user_id.is_(None)).all()
        }
        for name, kcal, p, c, fat, fiber, sugar, na, serving, label, approx in CATALOGUE:
            values = dict(
                source="curated",
                calories_100g=kcal,
                protein_100g=p,
                carbs_100g=c,
                fat_100g=fat,
                fiber_100g=fiber,
                sugar_100g=sugar,
                sodium_mg_100g=na,
                serving_g=serving,
                serving_label=label,
                is_approx=approx,
            )
            row = existing.get((name, ""))
            if row is None:
                db.add(Food(id=uuid4(), owner_user_id=None, name=name, brand="", **values))
                created += 1
            else:
                for key, value in values.items():
                    setattr(row, key, value)
                updated += 1
        db.commit()
    return created, updated


if __name__ == "__main__":
    made, changed = seed()
    print(f"Seeded foods: {made} created, {changed} updated.")
