import nodemailer from 'nodemailer'
import type { SendMailOptions, Transporter } from 'nodemailer'

type MailConfig = {
  enabled: boolean
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

type SendNotificationMailPayload = {
  to: string[]
  subject: string
  text: string
  html?: string
}

let transporter: Transporter | null = null
let transporterSignature: string | null = null

const parseBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return false
  return value.toLowerCase() === 'true'
}

const getMailConfig = (): MailConfig => {
  const runtimeConfig = useRuntimeConfig()

  return {
    enabled: parseBoolean(runtimeConfig.mailEnabled),
    host: String(runtimeConfig.smtpHost || '').trim(),
    port: Number(runtimeConfig.smtpPort || 0),
    secure: parseBoolean(runtimeConfig.smtpSecure),
    user: String(runtimeConfig.smtpUser || '').trim(),
    pass: String(runtimeConfig.smtpPass || ''),
    from: String(runtimeConfig.mailFrom || '').trim(),
  }
}

const isConfigComplete = (config: MailConfig): boolean => {
  return Boolean(
    config.host &&
      config.port > 0 &&
      config.user &&
      config.pass &&
      config.from
  )
}

const ensureTransporter = async (config: MailConfig): Promise<Transporter> => {
  const signature = `${config.host}:${config.port}:${config.secure}:${config.user}`

  if (transporter && transporterSignature === signature) {
    return transporter
  }

  const nextTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  })

  await nextTransporter.verify()

  transporter = nextTransporter
  transporterSignature = signature
  return nextTransporter
}

export const sendNotificationMail = async (
  payload: SendNotificationMailPayload
): Promise<{ sent: boolean; reason?: string }> => {
  const recipients = [...new Set(payload.to.map((email) => email.trim()).filter(Boolean))]

  if (recipients.length === 0) {
    return { sent: false, reason: 'No recipients' }
  }

  const config = getMailConfig()

  if (!config.enabled) {
    return { sent: false, reason: 'MAIL_ENABLED is false' }
  }

  if (!isConfigComplete(config)) {
    return { sent: false, reason: 'SMTP config is incomplete' }
  }

  const activeTransporter = await ensureTransporter(config)

  const message: SendMailOptions = {
    from: config.from,
    to: recipients.join(', '),
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  }

  await activeTransporter.sendMail(message)
  return { sent: true }
}
