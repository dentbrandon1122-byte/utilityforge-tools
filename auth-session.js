<script type="module">
  import { getCurrentUser } from "./supabase-client.js";

  export async function getEffectiveUser() {
    try {
      const user = await getCurrentUser();
      return user || null;
    } catch (error) {
      console.error("Failed to load current user:", error);
      return null;
    }
  }

  export async function getEffectiveUserId() {
    const user = await getEffectiveUser();

    if (user?.id) {
      localStorage.setItem("uf_user_id", user.id);
      return user.id;
    }

    let id = localStorage.getItem("uf_user_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("uf_user_id", id);
    }

    return id;
  }

  export async function getAccountState() {
    const user = await getEffectiveUser();

    return {
      loggedIn: Boolean(user),
      user: user || null,
      userId: user?.id || localStorage.getItem("uf_user_id") || null
    };
  }
</script>
