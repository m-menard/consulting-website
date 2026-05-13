const SIP_PROVIDER_INFO = {
  twilio: { name: "Twilio", defaultHost: "sip.twilio.com", defaultPort: 5061, transport: "tls" },
  plivo: { name: "Plivo", defaultHost: "sip.plivo.com", defaultPort: 5060, transport: "tcp" },
  telnyx: { name: "Telnyx", defaultHost: "sip.telnyx.com", defaultPort: 5061, transport: "tls" },
  vonage: { name: "Vonage", defaultHost: "sip.vonage.com", defaultPort: 5060, transport: "tcp" },
  exotel: { name: "Exotel", defaultHost: "sip.exotel.com", defaultPort: 5060, transport: "tcp" },
  bandwidth: { name: "Bandwidth", defaultHost: "sip.bandwidth.com", defaultPort: 5060, transport: "tcp" },
  didww: { name: "DIDWW", defaultHost: "sip.didww.com", defaultPort: 5060, transport: "tcp" },
  zadarma: { name: "Zadarma", defaultHost: "sip.zadarma.com", defaultPort: 5060, transport: "tcp" },
  cloudonix: { name: "Cloudonix", defaultHost: "sip.cloudonix.io", defaultPort: 5060, transport: "tcp" },
  ringcentral: { name: "RingCentral", defaultHost: "sip.ringcentral.com", defaultPort: 5060, transport: "tcp" },
  sinch: { name: "Sinch", defaultHost: "sip.sinch.com", defaultPort: 5060, transport: "tcp" },
  infobip: { name: "Infobip", defaultHost: "sip.infobip.com", defaultPort: 5060, transport: "tcp" },
  generic: { name: "Generic SIP", defaultHost: "", defaultPort: 5060, transport: "tcp" }
};
export {
  SIP_PROVIDER_INFO
};
