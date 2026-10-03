export interface Article {
  id: number;
  slug: string;
  title: string;
  subtitle?: string | null;
  section: string;
  category_tag: string;
  author: string;
  published_date: string;
  read_time: string;
  summary: string;
  content: string;
  image_url?: string | null;
  image_caption?: string | null;
  is_headline: number;
  is_brief: number;
  is_featured: number;
  order_rank: number;
  source_url?: string | null;
}

export interface Weather {
  id: number;
  city: string;
  temp: number;
  condition: string;
  wind: string;
  temp_min: number;
  temp_max: number;
  note: string;
}

export interface EditionMetadata {
  id: number;
  paper_name: string;
  motto: string;
  edition_number: string;
  edition_date: string;
  edition_tag: string;
  intent_of_day: string;
  top_left_banner: string;
  top_right_banner: string;
}

export interface EditorialNote {
  id: number;
  section_type: string;
  item_num: string;
  title: string;
  subtitle?: string | null;
  order_rank: number;
}
