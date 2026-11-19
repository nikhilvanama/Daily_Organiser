import { PlanType, Priority } from '../models/task.model';

export interface ParsedSmartPlan {
  title: string;
  type: PlanType;
  priority: Priority;
  dueDate?: string;
  startTime?: string;
  location?: string;
}

export function parseNaturalLanguagePlan(input: string): ParsedSmartPlan | null {
  if (!input || !input.trim()) return null;
  let text = input.trim();
  let type: PlanType = 'task';
  let priority: Priority = 'MEDIUM';
  let dueDate: string | undefined;
  let startTime: string | undefined;
  let location: string | undefined;

  // 1. Priority tags: !high, !urgent, !p1, !med, !medium, !p2, !low, !p3
  const prioMatch = text.match(/!(high|urgent|p1|med|medium|p2|low|p3)\b/i);
  if (prioMatch) {
    const p = prioMatch[1].toLowerCase();
    if (p === 'high' || p === 'urgent' || p === 'p1') priority = 'HIGH';
    else if (p === 'low' || p === 'p3') priority = 'LOW';
    else priority = 'MEDIUM';
    text = text.replace(prioMatch[0], ' ');
  }

  // 2. Type hashtag: #trip, #train, #journey, #food, #dinner, #lunch, #breakfast, #meeting, #event, #reminder, #outing, #health, #celebration, #task
  const hashMatch = text.match(/#(trip|train|journey|food|dinner|lunch|breakfast|meeting|event|reminder|outing|health|doctor|celebration|party|task)\b/i);
  if (hashMatch) {
    const t = hashMatch[1].toLowerCase();
    if (t === 'trip') type = 'trip';
    else if (t === 'train' || t === 'journey') type = 'train';
    else if (t === 'food' || t === 'dinner' || t === 'lunch' || t === 'breakfast') type = 'dinner';
    else if (t === 'meeting') type = 'meeting';
    else if (t === 'event') type = 'event';
    else if (t === 'reminder') type = 'reminder';
    else if (t === 'outing') type = 'outing';
    else if (t === 'health' || t === 'doctor') type = 'health';
    else if (t === 'celebration' || t === 'party') type = 'celebration';
    else type = 'task';
    text = text.replace(hashMatch[0], ' ');
  } else {
    // Keyword inferencing if no hashtag
    const lower = text.toLowerCase();
    if (/\b(flight|fly to|trip to|travel to|vacation|tour|holiday to)\b/i.test(lower)) type = 'trip';
    else if (/\b(train|bus to|metro|boarding|commute)\b/i.test(lower)) type = 'train';
    else if (/\b(dinner|lunch|breakfast|brunch|cafe|restaurant|eat at)\b/i.test(lower)) type = 'dinner';
    else if (/\b(meeting|zoom|call with|standup|sync with|interview)\b/i.test(lower)) type = 'meeting';
    else if (/\b(doctor|dentist|clinic|hospital|medicine|checkup)\b/i.test(lower)) type = 'health';
    else if (/\b(movie|cinema|mall|park|outing|picnic)\b/i.test(lower)) type = 'outing';
    else if (/\b(birthday|anniversary|wedding|celebration|party)\b/i.test(lower)) type = 'celebration';
  }

  // 3. Time pattern: "at 6:30pm", "at 10am", "18:00", "7:30 PM", "9am"
  const timeMatch = text.match(/\b(?:at\s+)?([01]?\d|2[0-3])(?::([0-5]\d))?\s*(am|pm)\b/i) ||
                    text.match(/\bat\s+([01]?\d|2[0-3]):([0-5]\d)\b/i);
  if (timeMatch) {
    if (timeMatch[3]) {
      // 12-hour format with am/pm
      let h = parseInt(timeMatch[1], 10);
      const m = timeMatch[2] ? timeMatch[2].padStart(2, '0') : '00';
      const meridiem = timeMatch[3].toLowerCase();
      if (meridiem === 'pm' && h < 12) h += 12;
      if (meridiem === 'am' && h === 12) h = 0;
      startTime = `${String(h).padStart(2, '0')}:${m}`;
    } else {
      // 24-hour format
      const h = String(parseInt(timeMatch[1], 10)).padStart(2, '0');
      const m = timeMatch[2].padStart(2, '0');
      startTime = `${h}:${m}`;
    }
    text = text.replace(timeMatch[0], ' ');
  }

  // 4. Date pattern: "today", "tomorrow", "tonight", "yesterday", day of week
  const today = new Date();
  const dateMatch = text.match(/\b(today|tonight|tomorrow|yesterday)\b/i);
  if (dateMatch) {
    const word = dateMatch[1].toLowerCase();
    const d = new Date(today);
    if (word === 'tomorrow') d.setDate(d.getDate() + 1);
    else if (word === 'yesterday') d.setDate(d.getDate() - 1);
    dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    text = text.replace(dateMatch[0], ' ');
  } else {
    // Check "on friday", "next monday", etc.
    const dayMatch = text.match(/\b(?:on|next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\b/i);
    if (dayMatch) {
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const targetStr = dayMatch[1].toLowerCase().slice(0, 3);
      const targetDay = dayNames.indexOf(targetStr);
      if (targetDay !== -1) {
        const d = new Date(today);
        let diff = targetDay - d.getDay();
        if (diff <= 0) diff += 7; // Next occurrence
        d.setDate(d.getDate() + diff);
        dueDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        text = text.replace(dayMatch[0], ' ');
      }
    }
  }

  // 5. Location pattern: "@Place" or "at <Place>"
  const atLocMatch = text.match(/@([a-zA-Z0-9\s,.-]+)$/);
  if (atLocMatch) {
    location = atLocMatch[1].trim();
    text = text.replace(atLocMatch[0], ' ');
  } else {
    const textLocMatch = text.match(/\b(?:at|in)\s+([A-Z][a-zA-Z0-9\s,.-]+)$/);
    if (textLocMatch) {
      location = textLocMatch[1].trim();
      text = text.replace(textLocMatch[0], ' ');
    }
  }

  // Clean remaining text as title
  let cleanedTitle = text.replace(/\s+/g, ' ').trim();
  // Strip trailing or leading punctuation
  cleanedTitle = cleanedTitle.replace(/^[-,.:;]+|[-,.:;]+$/g, '').trim();

  return {
    title: cleanedTitle || input.trim(),
    type,
    priority,
    dueDate,
    startTime,
    location,
  };
}
