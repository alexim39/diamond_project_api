import { ProspectModel } from './../prospect/models/prospect.model.js';
// import { ProspectModel } from './../partner/models/partner.model.js';

export async function GeneratePartnerNotifications(partnerId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const notifications = [];

  const prospects = await ProspectModel.find({ partnerId });

  for (const prospect of prospects) {
    const fullName = `${capitalizeFirstLetter(prospect.prospectName)} ${capitalizeFirstLetter(prospect.prospectSurname) || ''}`.trim();

    // 1. URGENT: Expected Decision Today
    if (prospect.status?.expectedDecisionDate) {
      const expectedDate = new Date(prospect.status.expectedDecisionDate);
      expectedDate.setHours(0, 0, 0, 0);
      if (expectedDate.getTime() === today.getTime() || expectedDate < today) {
        notifications.push({
          title: `URGENT: Call ${fullName}`,
          description: `Expected decision by today`,
          icon: 'priority_high',
          tag: 'Decision checkpoint',
          urgency: true,
        });
        continue;
      }
    }

    // 2. Follow-up Based on Last Communication
    const lastComm = prospect.communications?.[prospect.communications.length - 1];
    if (lastComm && lastComm.date) {
      const commDate = new Date(lastComm.date);
      const timeDifference = today.getTime() - commDate.getTime();
      const daysSince = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
      const typeIcons = {
        call: 'call',
        text: 'sms',
        email: 'mail',
        zoom: 'smart_display',
        whatsapp: 'chat',
      };

      // a. High Interest Level
      if (lastComm.interestLevel === 'hot' && daysSince <= 2) {
        notifications.push({
          title: `Call ${fullName}`,
          description: `Expressed strong interest ${daysSince} day(s) ago`,
          icon: typeIcons[lastComm.type] || 'notifications',
          tag: 'Hot Lead',
        });
        continue;
      }

      // b. Follow-up Action Required
      if (lastComm.followUpAction && lastComm.followUpAction !== 'To be determined') {
        notifications.push({
          title: `${capitalizeFirstLetter(lastComm.type)} ${fullName}`,
          description: `${lastComm.followUpAction}`,
          icon: typeIcons[lastComm.type] || 'notifications',
          tag: 'Follow-up needed',
        });
        continue;
      }

      // c. Recent contact needs confirmation
      if (daysSince === 1 && lastComm.description?.toLowerCase().includes('delivered')) {
        notifications.push({
          title: `Text ${fullName}`,
          description: `Product samples delivered yesterday`,
          icon: 'sms',
          tag: 'Confirmation needed',
        });
        continue;
      }
    }

    // 3. Onboarding reminder
    if (prospect.status?.onboardingDate) {
      const onboardingDate = new Date(prospect.status.onboardingDate);
      onboardingDate.setHours(0, 0, 0, 0);
      if (onboardingDate.getTime() === today.getTime()) {
        notifications.push({
          title: `Onboard ${fullName}`,
          description: `Onboarding scheduled for today`,
          icon: 'event',
          tag: 'Action required',
        });
      }
    }
  }

  return notifications;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}