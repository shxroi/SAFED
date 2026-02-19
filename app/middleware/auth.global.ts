export default defineNuxtRouteMiddleware((to, from) => {
    const { user, loggedIn } = useAuth()

    if (!loggedIn.value && to.path !== '/') {
        return navigateTo('/')
    }

    if (loggedIn.value && to.path === '/') {
        const role = user.value?.roles
        if (role === "STAFF") return navigateTo('/operations')
        if (role === "OBSERVER") return navigateTo('/observer')
        return navigateTo('/users')
    }

    if ((to.path.startsWith('/users') || to.path.startsWith('/tools')) && user.value?.roles !== 'IM') {
        return navigateTo('/operations')
    }

    if (to.path.startsWith('/operations/create') && user.value?.roles !== 'IM') {
        return navigateTo('/operations')
    }

    if (to.path.startsWith('/observer') && user.value?.roles !== 'OBSERVER') {
        return navigateTo('/')
    }
})
