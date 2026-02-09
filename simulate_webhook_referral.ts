import { PrismaClient } from '@prisma/client'
import { calculateCommissionOnPayment } from './lib/services/referral.service'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.findFirst({ where: { email: 'angular.tv@gmail.com' } });
  if (!user || !user.stripeCustomerId) {
    console.error('User not found or has no stripeCustomerId');
    return;
  }

  console.log('--- SIMULATING REFERRAL CREDIT ---');
  console.log('User:', user.email);
  console.log('Stripe Customer ID:', user.stripeCustomerId);

  // Use the referral code we know should be there
  const referralCode = 'CL8Y5YKU';
  const paymentAmount = 1000; //  or 1000 MXN in cents
  const paymentId = 'pi_simulated_' + Date.now();
  const invoiceId = 'in_simulated_' + Date.now();
  const currency = 'mxn';

  const result = await calculateCommissionOnPayment(
    user.stripeCustomerId,
    paymentId,
    invoiceId,
    paymentAmount,
    currency,
    referralCode
  );

  console.log('Result:', JSON.stringify(result, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
