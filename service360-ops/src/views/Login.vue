<template>
  <div class="login-page">
    <div class="logo-fixed">
      <img src="@/assets/img/logo.png" alt="Service360 Logo" />
    </div>

    <div class="language-fixed">
      <a href="#">Қаз</a>
      <a href="#" class="active">Рус</a>
      <a href="#">Eng</a>
    </div>

    <div class="login-container">
      <div class="login-card">
        <div class="login-content">
          <div>
            <h2 class="login-title centered">Вход в систему</h2>
            <p class="login-subtitle centered">
              Для входа во внутреннюю систему DTJ Service введите логин и пароль.
            </p>
          </div>

          <form @submit.prevent="handleLogin">
            <div class="form-fields">
              <AppInput v-model="username" placeholder="Логин" />
              <AppInput v-model="password" type="password" placeholder="Пароль" />
            </div>

            <MainButton :label="'ВОЙТИ'" :loading="loading" type="submit" />
          </form>
        </div>
      </div>
    </div>

    <footer class="footer-note">
      Разработано ТОО "Компания системных исследований 'Фактор'"
    </footer>

    <AppNotification />
  </div>
</template>

<script>
import AppInput from "@/shared/ui/FormControls/AppInput.vue"
import MainButton from "@/shared/ui/MainButton.vue"
import AppNotification from "@/app/layouts/AppNotification.vue"
import { login, getCurrentUser, getPersonnalInfo } from "@/shared/api/auth/auth"
import { useNotificationStore } from "@/app/stores/notificationStore"

export default {
  name: "Login",
  components: {
    AppInput,
    MainButton,
    AppNotification,
  },
  data() {
    return {
      username: "",
      password: "",
      loading: false,
    }
  },
  methods: {
    async handleLogin() {
      if (this.loading) return; // Предотвращаем повторные вызовы

      const notify = useNotificationStore()
      this.loading = true

      try {
        const loginResponse = await login(this.username, this.password)
        
        // This is the correct way to get the user ID
        const curUser = await getCurrentUser()
        console.log('User target:', curUser?.result?.target)

        const userId = curUser?.result?.id

        if (!userId) throw new Error("Не удалось получить ID пользователя")

        const personnalInfo = await getPersonnalInfo(userId)
        const info = personnalInfo?.records?.[0] || {}

        if (info.objLocation) {
          localStorage.setItem("objLocation", info.objLocation)
        } else {
          console.warn("objLocation не найден в personnalInfo")
        }

        localStorage.setItem("userAuth", JSON.stringify(loginResponse))
        localStorage.setItem("curUser", JSON.stringify(curUser))
        localStorage.setItem("personnalInfo", JSON.stringify(info))
        localStorage.setItem("userId", userId)

        notify.showNotification("Успешный вход!", "success")
        this.$router.push("/main")
      } catch (err) {
        console.error("Ошибка при входе:", err)

        let message = "Ошибка авторизации"
        if (err?.response?.data) {
          const data = err.response.data
          if (typeof data === "string") {
            if (data.includes("Имя пользователя")) {
              message = "Имя пользователя или пароль не верные"
            } else {
              message = data
            }
          } else if (typeof data === "object" && data.message) {
            message = data.message
          }
        } else if (typeof err?.request?.response === "string") {
          const html = err.request.response
          const match = html.match(/<pre[^>]*>(.*?)<\/pre>/i)
          if (match && match[1]) message = match[1]
        } else if (err.message) {
          message = err.message
        }

        notify.showNotification(message, "error")
      } finally {
        this.loading = false
      }
    },
  },
}
</script>




<style scoped>
.login-page {
  position: relative;
  height: 100vh;
  width: 100%;
  background: url('@/assets/img/background.jpg') no-repeat center center;
  background-size: cover;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  box-sizing: border-box;
}

.logo-fixed {
  position: fixed;
  top: 5vw;
  left: 5vw;
}

.logo-fixed img {
  height: 60px;
}

.language-fixed {
  position: fixed;
  top: 5vw;
  right: 5vw;
  font-size: 15px;
  color: #007bff;
}

.language-fixed a {
  margin-left: 10px;
  color: #cccccc;
  text-decoration: none;
}

.language-fixed a.active {
  font-weight: bold;
  color: #007bff;
}

.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  flex: 1;
  width: 100%;
  max-width: 600px;
  padding: 40px 20px;
  box-sizing: border-box;
}

.login-card {
  background: #fff;
  padding: 40px 30px;
  width: 100%;
  max-width: 400px;
  min-height: 50vh;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  justify-content: center;
  text-align: center;
  box-sizing: border-box;
}


.login-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
}

.login-subtitle {
  font-size: 15px;
  color: #6b7280;
  margin-bottom: 24px;
}

.form-fields {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
  text-align: left;
}

.footer-note {
  position: fixed;
  bottom: 20px;
  left: 0;
  width: 100%;
  text-align: center;
  font-size: 12px;
  color: #999;
}

.login-content {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}

form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}
@media (max-width: 480px) {
  .logo-fixed,
  .language-fixed {
    top: 20px;
    left: 20px;
    right: 20px;
  }

  .login-card {
    padding: 24px;
  }

  .login-title {
    font-size: 20px;
  }
}

</style>
