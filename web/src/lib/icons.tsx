import {
    Award,
    Bath,
    Bed,
    Bike,
    Bird,
    BookOpen,
    Brush,
    CalendarCheck,
    Car,
    Cat,
    CookingPot,
    Crown,
    Dog,
    Fish,
    Flame,
    Flower2,
    Footprints,
    Gamepad2,
    Gem,
    Gift,
    GlassWater,
    Heart,
    IceCreamCone,
    Leaf,
    Medal,
    Moon,
    Music,
    Palette,
    PawPrint,
    Pizza,
    Rabbit,
    Rocket,
    Shirt,
    ShoppingCart,
    Sparkles,
    Star,
    Sun,
    Sunrise,
    Target,
    Ticket,
    Trash2,
    Trophy,
    Turtle,
    Tv,
    Utensils,
    WashingMachine,
    Zap,
    type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
    award: Award,
    bath: Bath,
    bed: Bed,
    bike: Bike,
    bird: Bird,
    "book-open": BookOpen,
    brush: Brush,
    "calendar-check": CalendarCheck,
    car: Car,
    cat: Cat,
    "cooking-pot": CookingPot,
    crown: Crown,
    dog: Dog,
    fish: Fish,
    flame: Flame,
    flower: Flower2,
    footprints: Footprints,
    gamepad: Gamepad2,
    gem: Gem,
    gift: Gift,
    "glass-water": GlassWater,
    heart: Heart,
    "ice-cream": IceCreamCone,
    leaf: Leaf,
    medal: Medal,
    moon: Moon,
    music: Music,
    palette: Palette,
    "paw-print": PawPrint,
    pizza: Pizza,
    rabbit: Rabbit,
    rocket: Rocket,
    shirt: Shirt,
    "shopping-cart": ShoppingCart,
    sparkles: Sparkles,
    star: Star,
    sun: Sun,
    sunrise: Sunrise,
    target: Target,
    ticket: Ticket,
    trash: Trash2,
    trophy: Trophy,
    turtle: Turtle,
    tv: Tv,
    utensils: Utensils,
    "washing-machine": WashingMachine,
    zap: Zap,
};

export const CATEGORY_ICON_KEYS = [
    "sparkles",
    "utensils",
    "cooking-pot",
    "glass-water",
    "shirt",
    "washing-machine",
    "bed",
    "bath",
    "trash",
    "paw-print",
    "leaf",
    "flower",
    "book-open",
    "music",
    "palette",
    "brush",
    "shopping-cart",
    "car",
    "bike",
    "star",
];

export const AVATAR_ICON_KEYS = [
    "cat",
    "dog",
    "rabbit",
    "bird",
    "fish",
    "turtle",
    "rocket",
    "star",
    "heart",
    "crown",
    "sun",
    "moon",
    "flower",
    "gem",
    "zap",
    "gamepad",
];

export const REWARD_ICON_KEYS = ["gift", "tv", "gamepad", "pizza", "ice-cream", "moon", "ticket", "bike", "palette", "star"];

export const COLORS = [
    "#6366f1",
    "#8b5cf6",
    "#ec4899",
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#14b8a6",
    "#0ea5e9",
    "#3b82f6",
    "#64748b",
];

export function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
    const Component = ICONS[name] ?? Star;
    return <Component size={size} className={className} aria-hidden="true" strokeWidth={2} />;
}

// A coloured rounded tile holding an icon; used for categories, avatars and badges.
export function IconTile({
    name,
    color,
    size = 44,
    rounded = "rounded-2xl",
    solid = false,
}: {
    name: string;
    color: string;
    size?: number;
    rounded?: string;
    solid?: boolean;
}) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center ${rounded}`}
            style={{
                width: size,
                height: size,
                color: solid ? "#fff" : color,
                background: solid ? color : `color-mix(in srgb, ${color} 15%, transparent)`,
            }}
        >
            <Icon name={name} size={Math.round(size * 0.5)} />
        </span>
    );
}
