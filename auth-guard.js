<script type="module">
  import { getCurrentUser } from "./supabase-client.js";

  export async function requireAuth(redirectTo = "login.html") {
    try {
      const user = await getCurrentUser();

      if (!user) {
        window.location.href = redirectTo;
        return null;
      }

      return user;
    } catch (error) {
      console.error("Auth guard error:", error);
      window.location.href = redirectTo;
      return null;
    }
  }

  export async function getAuthUserOrNull() {
    try {
      return await getCurrentUser();
    } catch (error) {
      console.error("Failed to get auth user:", error);
      return null;
    }
  }
</script>
