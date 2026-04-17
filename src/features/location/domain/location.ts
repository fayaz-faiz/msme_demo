export type Location = {
  city: string;
  state?: string;
  pincode: string;
  label: string;
  lat: number;
  lng: number;
};

export type LocationSuggestion = Location & {
  rawLabel: string;
};
