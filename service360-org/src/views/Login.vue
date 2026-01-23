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
          <div class="header-section">
            <div class="logo-mobile">
              <img src="@/assets/img/s360.PNG" alt="Service360 Logo" />
            </div>
            <h2 class="login-title">Добро пожаловать</h2>
            <p class="login-subtitle">
              Для входа во внутреннюю систему DTJ Service введите логин и пароль
            </p>
          </div>

          <form @submit.prevent="handleLogin">
            <div class="form-fields">
              <AppInput label="Логин" v-model="username" placeholder="Введите логин" />
              <AppInput label="Пароль" v-model="password" type="password" placeholder="Введите пароль" />
            </div>

            <div class="submit-button-wrapper">
              <MainButton :label="'ВОЙТИ'" :loading="loading" type="submit" />
            </div>
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
import { login, getCurrentUser, getPersonnalInfo } from "@/shared/api/auth/auth.js"
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

        // Сохраняем ID пользователя для userCache
        if (info.id) {
          localStorage.setItem("userId", info.id.toString())
        }

        localStorage.setItem("userAuth", JSON.stringify(loginResponse))
        localStorage.setItem("curUser", JSON.stringify(curUser))
        localStorage.setItem("personnalInfo", JSON.stringify(info))

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
  padding: 20px;
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

.logo-mobile {
  display: none;
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

.header-section {
  margin-bottom: 30px;
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 10px;
  color: #1f2937;
}

.login-subtitle {
  font-size: 15px;
  color: #9ca3af;
  margin-bottom: 0;
  line-height: 1.5;
}

.input-label {
  display: none;
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 6px;
  margin-top: 8px;
  text-align: left;
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
  height: 100%;
}

@media (max-width: 768px) {
  .login-page {
    padding: 0;
    background: #f7fafc;
    overflow: hidden;
    height: 100vh;
  }

  .logo-fixed {
    display: none;
  }

  .logo-mobile {
    display: flex;
    justify-content: center;
    margin-bottom: 30px;
    margin-top: 20px;
  }

  .logo-mobile img {
    height: 160px;
  }

  .language-fixed {
    display: none;
  }

  .login-container {
    padding: 0;
    max-width: 100%;
    height: 100vh;
  }

  .login-card {
    padding: 40px 24px 20px 24px;
    height: 100%;
    max-width: 100%;
    border-radius: 0;
    box-shadow: none;
    justify-content: center;
    padding-top: 60px;
    display: flex;
    flex-direction: column;
  }

  .login-title {
    font-size: 22px;
    margin-bottom: 12px;
  }

  .header-section {
    margin-bottom: 80px;
    margin-top: 40px;
  }

  .login-subtitle {
    font-size: 14px;
    margin-bottom: 0;
    padding: 0 90px;
  }

  .input-label {
    display: block;
  }

  .input-label:first-of-type {
    margin-top: 0;
  }

  .form-fields {
    margin-bottom: 24px;
  }

  form {
    justify-content: space-between;
    flex: 1;
    padding-bottom: 80px;
  }

  .login-content {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .submit-button-wrapper {
    position: fixed;
    bottom: 46px;
    left: 0;
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
  }

  .footer-note {
    position: fixed;
    bottom: 15px;
    font-size: 11px;
    color: #9ca3af;
  }
}

@media (max-width: 480px) {
  .login-card {
    padding: 0;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }

  .login-content {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 0 24px;
    padding-bottom: 60px;
  }

  .header-section {
    flex-shrink: 0;
    padding-top: 40px;
    margin-bottom: 0;
  }

  .logo-mobile {
    margin-top: 0;
    margin-bottom: 40px;
  }

  .logo-mobile img {
    height: 120px;
  }

  .login-title {
    font-size: 24px;
    margin-bottom: 16px;
    font-weight: 600;
    color: #1f2937;
  }

  .login-subtitle {
    font-size: 13px;
    line-height: 1.6;
    margin-bottom: 0;
    color: #9ca3af;
    padding: 0;
  }

  .input-label {
    font-size: 13px;
    color: #9ca3af;
    font-weight: normal;
  }

  form {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 0;
    margin: 0;
  }


  .form-fields {
    gap: 16px;
    margin-bottom: 32px;
  }

  form button {
    margin-top: 0;
  }

  .submit-button-wrapper {
    position: fixed;
    bottom: 46px;
    left: 0;
    width: 100%;
    padding: 0 20px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
  }

  .footer-note {
    position: fixed;
    bottom: 16px;
    font-size: 10px;
    color: #9ca3af;
    left: 0;
    right: 0;
    text-align: center;
  }
}
</style>
