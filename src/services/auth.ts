import apiClient from "@/lib/axios";

const getLoginErrorMessage = (error: any) => {
  const responseData = error?.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  return (
    responseData?.error ||
    responseData?.message ||
    error?.message ||
    "خطأ أثناء تسجيل الدخول"
  );
};

export default async function userLogin({username, password}) {

    try {

      const response = await apiClient.post("/api/auth/login", {
        username: username,
        password: password,
      });

      return response.data
      
    } catch (err) {
      console.error("خطأ في تسجيل الدخول:", err);
      throw new Error(getLoginErrorMessage(err));
   
    }

}
