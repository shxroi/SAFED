export default defineNuxtRouteMiddleware((to, from) => {
    const { user, loggedIn } = useAuth()

    if (!loggedIn.value && to.path !== '/') {
        return navigateTo('/')
    }

    if (loggedIn.value && to.path === '/') {
        const role = user.value?.roles
        if (role === "STAFF") return navigateTo('/staff')
        if (role === "OBSERVER") return navigateTo('/observer')
        return navigateTo('/users')
    }

    if (to.path.startsWith('/users') && user.value?.roles !== 'IM') {
        return navigateTo('/')
    }
})
