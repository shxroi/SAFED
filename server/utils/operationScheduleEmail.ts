import nodemailer from 'nodemailer'

interface OperationScheduleEmailInput {
  recipients: string[]
  operation: {
    id: number
    company: string
    type: string
    vesselName: string | null
    location: string
    date: Date
  }
}

const getSmtpConfig = () => {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || '587')
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM

  if (!host || !user || !pass || !from || Number.isNaN(port)) {
    return null
  }

  return {
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
    from,
  }
}

export const sendOperationScheduleEmail = async (
  input: OperationScheduleEmailInput,
): Promise<{ sent: boolean; reason?: string }> => {
  if (input.recipients.length === 0) {
    return { sent: false, reason: 'No recipient email found' }
  }

  const smtp = getSmtpConfig()
  if (!smtp) {
    return { sent: false, reason: 'SMTP config is incomplete' }
  }

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
  })

  const operationLabel = input.operation.vesselName
    ? `${input.operation.vesselName} - ${input.operation.company}`
    : input.operation.company

  const dateLabel = input.operation.date.toISOString()

  await transporter.sendMail({
    from: smtp.from,
    to: input.recipients.join(','),
    subject: `[SAFED] Operation schedule: ${operationLabel}`,
    text: [
      'Operation schedule details',
      `Operation ID: ${input.operation.id}`,
      `Company: ${input.operation.company}`,
      `Vessel: ${input.operation.vesselName || '-'}`,
      `Type: ${input.operation.type}`,
      `Location: ${input.operation.location}`,
      `Date: ${dateLabel}`,
      '',
      'Please review in SAFED.',
    ].join('\n'),
  })

  return { sent: true }
}
