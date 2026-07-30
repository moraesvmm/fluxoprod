require('dotenv').config({ path: '.env.local' });
async function run() {
  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) { console.log('no key'); return; }
  console.log('Got key:', apiKey.slice(0, 10) + '...');
  
  const mode = process.env.NEXT_PUBLIC_GATEWAY_MODE === "production" ? "api" : "sandbox";
  console.log("Mode:", mode);

  // fetch some customers just to see if key works
  const res = await fetch(`https://${mode}.asaas.com/v3/customers`, {
    headers: { 'access_token': apiKey }
  });
  const data = await res.json();
  if (!res.ok) { console.log('Error:', data); return; }
  
  const customerId = data.data[0].id;
  console.log("Using customer:", customerId);
  
  const subRes = await fetch(`https://${mode}.asaas.com/v3/subscriptions`, {
    method: 'POST',
    headers: { 'access_token': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: 10,
      nextDueDate: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      cycle: "MONTHLY",
      description: "Assinatura Teste"
    })
  });
  
  const subData = await subRes.json();
  console.log("Subscription payload:", JSON.stringify(subData, null, 2));
}
run();
