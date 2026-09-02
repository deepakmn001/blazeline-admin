import axios from "axios";
import Cookies from "js-cookie";

export async function loginAdmin(username: string, password: string) {
  const { data } = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/admin/login/`,
    { username, password }
  );

  Cookies.set("access_token", data.access, { expires: 1 / 3 });
  Cookies.set("refresh_token", data.refresh, { expires: 7 });

  return data;
}

export function logoutAdmin() {
  Cookies.remove("access_token");
  Cookies.remove("refresh_token");
}