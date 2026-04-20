export type Shop = {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string;
  providerStreet?: string;
  rating: number;
  deliveryTime: string;
  image: string;
  accent: string;
  providerId?: string;
  providerLocationId?: string;
  providerStatus?: string;
  verified?: boolean;
  serviceable?: boolean;
  distance?: string;
};
