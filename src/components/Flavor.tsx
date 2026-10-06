export type Flavor = {
  id: string | number;
  name: string;
  slug: string;
  categoryName: string;
  description: string;
  image: string;
  price: number;
  discountPrice: number;
  qty: number;
  isActive: boolean;
};