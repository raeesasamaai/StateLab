import { type Config, type Dataset } from "./model";
export const components = [
  {
    id: "product",
    name: "Product card",
    description: "Commerce, with a little more resilience.",
    short: "Card",
  },
  {
    id: "table",
    name: "Data table",
    description: "Dense data. Clear decisions.",
    short: "Table",
  },
  {
    id: "people",
    name: "People list",
    description: "Every person brings different content.",
    short: "People",
  },
] as const;
export const presets = [
  {
    id: "baseline",
    name: "Happy path",
    description: "The comfortable starting point.",
    icon: "sun",
  },
  {
    id: "long",
    name: "Long content",
    description: "Names and descriptions that keep going.",
    icon: "text",
  },
  {
    id: "missing",
    name: "Missing data",
    description: "Absent fields, images and prices.",
    icon: "minus",
  },
  {
    id: "empty",
    name: "Zero results",
    description: "A completely empty dataset.",
    icon: "empty",
  },
  {
    id: "unicode",
    name: "Multilingual",
    description: "Different scripts, names and characters.",
    icon: "globe",
  },
  {
    id: "extreme",
    name: "Extreme numbers",
    description: "Very large values. Very little space.",
    icon: "hash",
  },
  {
    id: "unbroken",
    name: "Unbroken strings",
    description: "Content with nowhere easy to wrap.",
    icon: "link",
  },
] as const;
export function baseline(): Dataset {
  return {
    products: [
      {
        id: "p1",
        title: "The Everyday Chair",
        description:
          "A quiet corner. A good book. A chair that makes room for both. Solid oak, softly upholstered.",
        price: 249,
        stock: 24,
        category: "Objects for living",
        image: "/sample-chair.svg",
      },
      {
        id: "p2",
        title: "Arc Table Lamp",
        description:
          "Warm light, thoughtfully shaped. An adjustable desk lamp for slower evenings.",
        price: 89,
        stock: 0,
        category: "Lighting",
        image: "/sample-chair.svg",
      },
      {
        id: "p3",
        title: "Linen Cushion",
        description: "Soft texture for your everyday spaces.",
        price: 39,
        stock: 102,
        category: "Textiles",
        image: null,
      },
      {
        id: "p4",
        title: "Oak Side Table",
        description: "A small place for the things you keep close.",
        price: 129,
        stock: 8,
        category: "Furniture",
        image: null,
      },
    ],
    people: [
      {
        id: "u1",
        name: "Amara Okafor",
        email: "amara@example.com",
        role: "Product designer",
        company: "Forma Studio",
        avatar: null,
      },
      {
        id: "u2",
        name: "Leo Martin",
        email: "leo@example.com",
        role: "Frontend developer",
        company: "Northstar",
        avatar: null,
      },
      {
        id: "u3",
        name: "Sofia Chen",
        email: "sofia@example.com",
        role: "Design engineer",
        company: "Studio Common",
        avatar: null,
      },
      {
        id: "u4",
        name: "Daniel Jacobs",
        email: "daniel@example.com",
        role: "Creative developer",
        company: "Independent",
        avatar: null,
      },
    ],
  };
}
export function fixture(preset: Config["preset"]): Dataset {
  const d = baseline();
  if (preset === "empty") return { products: [], people: [] };
  if (preset === "long") {
    d.products = d.products.map((p) => ({
      ...p,
      title:
        p.title +
        " — The Limited-Edition Collection for Thoughtfully Designed Everyday Spaces",
      description:
        p.description +
        " " +
        "Made with attention to every detail and designed to stay useful as life changes. ".repeat(
          5,
        ),
      category:
        "Responsibly sourced furniture and objects for considered contemporary living",
    }));
    d.people = d.people.map((p) => ({
      ...p,
      name: p.name + " de la Cruz-Williams van der Merwe",
      role: "Senior multidisciplinary product designer and frontend development lead",
      company: "The Independent Collective for Thoughtful Digital Experiences",
    }));
  }
  if (preset === "missing") {
    d.products = d.products.map((p) => ({
      ...p,
      title: "",
      description: "",
      price: null,
      stock: null,
      image: null,
      category: "",
    }));
    d.people = d.people.map((p) => ({
      ...p,
      name: "",
      email: "",
      role: "",
      company: "",
      avatar: null,
    }));
  }
  if (preset === "unicode") {
    d.products[0] = {
      ...d.products[0],
      title: "椅子・كرسي・Chair ✨",
      description:
        "Designed for everyone. مرحباً بالعالم — こんにちは世界 — Olá, mundo! 🌿",
      category: "世界のデザイン · تصميم",
    };
    const names = [
      "أمينة الزهراء",
      "山田 はるか",
      "Zoë Łukaszewicz",
      "Naledi 🌻",
    ];
    d.people = d.people.map((p, i) => ({
      ...p,
      name: names[i],
      company: "世界のスタジオ / استوديو التصميم",
    }));
  }
  if (preset === "extreme") {
    d.products = d.products.map((p, i) => ({
      ...p,
      price: i === 0 ? 999999999999.99 : i === 1 ? 0 : 999999.99,
      stock: i === 0 ? 999999999 : i === 1 ? 0 : 999999,
    }));
  }
  if (preset === "unbroken") {
    const long = "ThisIsAnExceptionallyLongUnbrokenString".repeat(14);
    d.products = d.products.map((p) => ({
      ...p,
      title: long,
      description: long,
      category: long.slice(0, 900),
    }));
    d.people = d.people.map((p) => ({
      ...p,
      name: long,
      email: long + "@example.com",
      company: long,
      role: long.slice(0, 900),
    }));
  }
  return d;
}
export function defaultConfig(): Config {
  return {
    component: "product",
    preset: "baseline",
    state: "ready",
    errorSource: "simulation",
    width: 768,
    theme: "light",
    textScale: 100,
    direction: "ltr",
    currency: "USD",
    delay: 1500,
    outcome: "success",
    data: baseline(),
  };
}
