export interface Item {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string; // e.g. "kg", "pcs", "litre"
  imageUrl?: string;
  createdAt: string;
}

export interface ItemFormValues {
  name: string;
  category: string;
  price: number;
  unit: string;
}
