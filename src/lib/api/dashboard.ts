import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export interface DashboardStats {
  total_products: number;
  published_products: number;
  draft_products: number;
  categories: number;
  subcategories: number;
}

export interface RecentProduct {
  id: number;
  name: string;
  category: string | null;
  subcategory: string | null;
  status: string;
  created_at: string;
  image: string | null;
}

export interface CategoryDistribution {
  name: string;
  total: number;
}

export interface ProductGrowth {
  month: string;
  total: number;
}

export interface DashboardResponse {
  stats: DashboardStats;
  recent_products: RecentProduct[];
  category_distribution: CategoryDistribution[];
  product_growth: ProductGrowth[];
}

export const getDashboard = async (): Promise<DashboardResponse> => {
  const cookieStore = await cookies(); // Next.js 15 me await zaroori
  const token = cookieStore.get("access_token")?.value;

  // Token hi nahi hai -> login pe bhej do, backend ko call karne ki zarurat nahi
  if (!token) {
    redirect("/login");
  }

  try {
    const { data } = await axios.get<DashboardResponse>(
      `${process.env.NEXT_PUBLIC_API_URL}/dashboard/`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    return data;
  } catch (error: any) {
    // Token expire ho chuka / invalid -> login pe bhej do
    if (error.response?.status === 401) {
      redirect("/login");
    }
    throw error;
  }
};