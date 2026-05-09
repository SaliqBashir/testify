/**
 * Rule-based outreach copy (no external APIs).
 */

const INTENT = {
  quote: {
    ask: "provide a formal quote",
    detail: "pricing, lead times, and minimum order quantities",
  },
  catalog: {
    ask: "share your latest product catalog or line card",
    detail: "product families and technical specifications",
  },
  general: {
    ask: "connect us with the right technical contact",
    detail: "capabilities and typical project scope",
  },
};

export function generateOutreachEmail({
  companyName,
  specialization,
  product,
  intentKey,
  variation = 0,
}) {
  const spec = specialization || "your industrial solutions";
  const prod = (product || "").trim();
  const meta = INTENT[intentKey] || INTENT.general;

  const greetings = [
    `Dear ${companyName} team,`,
    `Hello ${companyName},`,
    `Good day,`,
  ];
  const closings = [
    "Thank you for your time.",
    "I look forward to your reply.",
    "Appreciate your help in advance.",
  ];

  const g = greetings[variation % greetings.length];
  const c = closings[variation % closings.length];

  const productBlock = prod
    ? `We are evaluating suppliers for: ${prod}.`
    : "We are evaluating suppliers for an upcoming sourcing initiative.";

  return `${g}

I am reaching out because of your specialization in ${spec}. ${productBlock}

Could you please ${meta.ask}? If helpful, please include information on ${meta.detail}.

${c}

Best regards,
[Your name]
[Your company]
[Phone]`.trim();
}
