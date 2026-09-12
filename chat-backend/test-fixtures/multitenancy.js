const companyA = Object.freeze({ id: 101, name: 'Empresa A' });
const companyB = Object.freeze({ id: 202, name: 'Empresa B' });

const channelA = Object.freeze({ id: 1001, companyId: companyA.id, name: 'Web A' });
const channelB = Object.freeze({ id: 2002, companyId: companyB.id, name: 'Web B' });

const agentA = Object.freeze({ id: 11, companyId: companyA.id, role: 'agent', channelIds: [channelA.id] });
const agentB = Object.freeze({ id: 22, companyId: companyB.id, role: 'agent', channelIds: [channelB.id] });
const clientA = Object.freeze({ id: 31, companyId: companyA.id, role: 'client', channelId: channelA.id });
const clientB = Object.freeze({ id: 42, companyId: companyB.id, role: 'client', channelId: channelB.id });

const chatA = Object.freeze({ id: 501, companyId: companyA.id, channelId: channelA.id, clientId: clientA.id, agentId: agentA.id });
const chatB = Object.freeze({ id: 602, companyId: companyB.id, channelId: channelB.id, clientId: clientB.id, agentId: agentB.id });

module.exports = {
  companyA,
  companyB,
  channelA,
  channelB,
  agentA,
  agentB,
  clientA,
  clientB,
  chatA,
  chatB
};
