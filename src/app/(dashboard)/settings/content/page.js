'use client';

import { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../../../lib/api';
import {
  Sparkles,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Info,
  Plus,
  Trash2,
  AlertCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/* Constants & helpers                                                 */
/* ------------------------------------------------------------------ */
const DEFAULT_FACTS = {
  numberOfRestaurants: 2,
  numberOfFloors: 4,
  totalRooms: 20,
  airportDistanceKm: '',
  railwayStationDistanceKm: '',
  petFriendly: false,
  coupleFriendly: true,
};

const DEFAULT_ADDRESS = {
  street: '',
  city: '',
  state: '',
  pincode: '',
  landmark: '',
  mapEmbedUrl: '',
};

const LIMITS = {
  item: 120, // reasons, amenities, policies
  language: 30,
  question: 200,
  answer: 1000,
  announcement: 250,
  distance: 60,
  landmark: 120,
  mapUrl: 1000,
};

// Stops "-", "+", "." and "e" in whole-number inputs
const blockInvalidKeys = (e) => {
  if (['-', '+', 'e', 'E', '.'].includes(e.key)) e.preventDefault();
};

const clean = (list) => list.map((s) => String(s).trim()).filter(Boolean);

const isValidMapUrl = (value) => {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && (u.hostname === 'google.com' || u.hostname.endsWith('.google.com'));
  } catch {
    return false;
  }
};

export default function HotelContentSettingsPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState('');
  const [activeTab, setActiveTab] = useState('reasons');

  const [form, setForm] = useState({
    announcement: { enabled: true, text: '' },
    topReasonsToBook: [],
    topAmenities: [],
    languagesSpoken: [],
    propertyPolicies: [],
    helpfulFacts: DEFAULT_FACTS,
    address: DEFAULT_ADDRESS,
    faqs: [],
  });

  useEffect(() => {
    fetchWithAuth('/hotel')
      .then((res) => {
        const h = res.data;
        if (h) {
          setForm({
            announcement: { enabled: true, text: '', ...(h.announcement || {}) },
            topReasonsToBook: h.topReasonsToBook || [],
            topAmenities: h.topAmenities || [],
            languagesSpoken: h.languagesSpoken || [],
            propertyPolicies: h.propertyPolicies || [],
            helpfulFacts: { ...DEFAULT_FACTS, ...(h.helpfulFacts || {}) },
            address: { ...DEFAULT_ADDRESS, ...(h.address || {}) },
            faqs: h.faqs || [],
          });
        }
      })
      .catch((err) => setFormError(err.message || 'Could not load property content.'));
  }, []);

  // Every edit goes through this so the "saved" banner hides as soon as something changes
  const update = (fn) => {
    setSaved(false);
    setFormError('');
    setForm(fn);
  };

  /* ---------------- field helpers ---------------- */
  const setFact = (key, value) =>
    update((prev) => ({ ...prev, helpfulFacts: { ...prev.helpfulFacts, [key]: value } }));

  const setAddress = (key, value) =>
    update((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));

  const setAnnouncement = (key, value) =>
    update((prev) => ({ ...prev, announcement: { ...prev.announcement, [key]: value } }));

  // Whole numbers only, never negative, capped at `max`
  const factNumberHandler = (key, max) => (e) => {
    const val = e.target.value;
    if (val === '') return setFact(key, '');
    const n = Number(val);
    if (Number.isNaN(n) || n < 0 || !Number.isInteger(n) || n > max) return;
    setFact(key, val);
  };

  const addArrayItem = (key) => update((prev) => ({ ...prev, [key]: [...prev[key], ''] }));

  const updateArrayItem = (key, idx, val) =>
    update((prev) => {
      const updated = [...prev[key]];
      updated[idx] = val;
      return { ...prev, [key]: updated };
    });

  const removeArrayItem = (key, idx) =>
    update((prev) => ({ ...prev, [key]: prev[key].filter((_, i) => i !== idx) }));

  const addFaq = () =>
    update((prev) => ({ ...prev, faqs: [...prev.faqs, { question: '', answer: '' }] }));

  const updateFaq = (idx, field, val) =>
    update((prev) => ({
      ...prev,
      faqs: prev.faqs.map((f, i) => (i === idx ? { ...f, [field]: val } : f)),
    }));

  const removeFaq = (idx) => update((prev) => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== idx) }));

  /* ---------------- validation ---------------- */
  // Returns { tab, message } for the first problem, or null
  const validate = () => {
    const f = form.helpfulFacts;

    const rooms = Number(f.totalRooms);
    if (f.totalRooms === '' || !Number.isInteger(rooms) || rooms < 1) {
      return { tab: 'facts', message: 'Total rooms must be a whole number, 1 or more.' };
    }
    const floors = Number(f.numberOfFloors);
    if (f.numberOfFloors === '' || !Number.isInteger(floors) || floors < 1) {
      return { tab: 'facts', message: 'Floors must be a whole number, 1 or more.' };
    }
    const restaurants = Number(f.numberOfRestaurants);
    if (f.numberOfRestaurants === '' || !Number.isInteger(restaurants) || restaurants < 0) {
      return { tab: 'facts', message: 'Number of restaurants must be a whole number, 0 or more.' };
    }

    const mapUrl = form.address.mapEmbedUrl.trim();
    if (mapUrl && !isValidMapUrl(mapUrl)) {
      return {
        tab: 'facts',
        message: 'Google Maps embed URL must start with https:// and be a google.com link.',
      };
    }

    if (form.announcement.enabled && !form.announcement.text.trim()) {
      return {
        tab: 'announcement',
        message: 'Enter the banner text, or turn off the announcement banner.',
      };
    }

    for (const faq of form.faqs) {
      const q = faq.question.trim();
      const a = faq.answer.trim();
      if ((q && !a) || (!q && a)) {
        return { tab: 'faqs', message: 'Each FAQ needs both a question and an answer. Fill in or remove the incomplete ones.' };
      }
    }

    return null;
  };

  /* ---------------- save ---------------- */
  const handleSave = async (e) => {
    e.preventDefault();

    const problem = validate();
    if (problem) {
      setActiveTab(problem.tab);
      setFormError(problem.message);
      setSaved(false);
      return;
    }

    setFormError('');
    setLoading(true);
    setSaved(false);

    // Trim text, drop blank rows, and turn number fields back into numbers
    const payload = {
      announcement: {
        enabled: form.announcement.enabled,
        text: form.announcement.text.trim(),
      },
      topReasonsToBook: clean(form.topReasonsToBook),
      topAmenities: clean(form.topAmenities),
      languagesSpoken: clean(form.languagesSpoken),
      propertyPolicies: clean(form.propertyPolicies),
      helpfulFacts: {
        ...form.helpfulFacts,
        totalRooms: Number(form.helpfulFacts.totalRooms),
        numberOfFloors: Number(form.helpfulFacts.numberOfFloors),
        numberOfRestaurants: Number(form.helpfulFacts.numberOfRestaurants),
        airportDistanceKm: form.helpfulFacts.airportDistanceKm.trim(),
        railwayStationDistanceKm: form.helpfulFacts.railwayStationDistanceKm.trim(),
      },
      address: {
        ...form.address,
        landmark: form.address.landmark.trim(),
        mapEmbedUrl: form.address.mapEmbedUrl.trim(),
      },
      faqs: form.faqs
        .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
        .filter((f) => f.question && f.answer),
    };

    try {
      await fetchWithAuth('/hotel/trust-content', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      // Reflect the cleaned data in the form (blank rows disappear)
      setForm((prev) => ({
        ...prev,
        announcement: payload.announcement,
        topReasonsToBook: payload.topReasonsToBook,
        topAmenities: payload.topAmenities,
        languagesSpoken: payload.languagesSpoken,
        propertyPolicies: payload.propertyPolicies,
        helpfulFacts: payload.helpfulFacts,
        address: payload.address,
        faqs: payload.faqs,
      }));
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'reasons', label: 'Reasons & Amenities', icon: Sparkles },
    { id: 'facts', label: 'Helpful Facts & Location', icon: MapPin },
    { id: 'faqs', label: 'FAQs & Policies', icon: HelpCircle },
    { id: 'announcement', label: 'Announcements', icon: Info },
  ];

  const inputBase =
    'w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900';

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Property Trust & Guest Guide</h1>
        <p className="text-sm text-slate-500 mt-1">
          Add dynamic amenities, maps, FAQs, and booking perks displayed directly inside the customer reservation drawer.
        </p>
      </div>

      {saved && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm flex items-center gap-2">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>All content details updated! Changes are live on your booking widget.</span>
        </div>
      )}

      {formError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm flex items-center gap-2">
          <AlertCircle size={18} className="text-rose-600 shrink-0" />
          <span>{formError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 pb-5 gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition -mb-px whitespace-nowrap ${
                active
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={15} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSave} className="bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        {/* TAB 1: REASONS & AMENITIES */}
        {activeTab === 'reasons' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Top Reasons to Book Direct</h3>
                  <p className="text-xs text-slate-400">Highlighted perks shown at the top of the guest booking drawer</p>
                </div>
                <button
                  type="button"
                  onClick={() => addArrayItem('topReasonsToBook')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} /> Add Reason
                </button>
              </div>

              <div className="space-y-2">
                {form.topReasonsToBook.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={LIMITS.item}
                      placeholder="e.g. Free breakfast for direct bookings"
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={item}
                      onChange={(e) => updateArrayItem('topReasonsToBook', idx, e.target.value)}
                    />
                    <button type="button" onClick={() => removeArrayItem('topReasonsToBook', idx)} className="text-slate-400 hover:text-rose-600" aria-label="Remove reason">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Featured Hotel Amenities</h3>
                  <p className="text-xs text-slate-400">Key property facilities shown as interactive badges</p>
                </div>
                <button
                  type="button"
                  onClick={() => addArrayItem('topAmenities')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} /> Add Amenity
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {form.topAmenities.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={LIMITS.item}
                      placeholder="e.g. Swimming pool"
                      className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={item}
                      onChange={(e) => updateArrayItem('topAmenities', idx, e.target.value)}
                    />
                    <button type="button" onClick={() => removeArrayItem('topAmenities', idx)} className="text-slate-400 hover:text-rose-600" aria-label="Remove amenity">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Languages Spoken by Staff</h3>
                  <p className="text-xs text-slate-400">Reassures guests for easy on-site communication</p>
                </div>
                <button
                  type="button"
                  onClick={() => addArrayItem('languagesSpoken')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} /> Add Language
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {form.languagesSpoken.map((lang, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    <input
                      type="text"
                      maxLength={LIMITS.language}
                      placeholder="Language"
                      className="bg-transparent text-xs font-semibold text-slate-800 w-24 outline-none"
                      value={lang}
                      onChange={(e) => updateArrayItem('languagesSpoken', idx, e.target.value)}
                    />
                    <button type="button" onClick={() => removeArrayItem('languagesSpoken', idx)} className="text-slate-400 hover:text-rose-600" aria-label="Remove language">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: HELPFUL FACTS & LOCATION */}
        {activeTab === 'facts' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-3">Key Property Facts</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Rooms</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className={inputBase}
                    value={form.helpfulFacts.totalRooms}
                    onChange={factNumberHandler('totalRooms', 1000)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Number of Restaurants</label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="50"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className={inputBase}
                    value={form.helpfulFacts.numberOfRestaurants}
                    onChange={factNumberHandler('numberOfRestaurants', 50)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Floors</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="200"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className={inputBase}
                    value={form.helpfulFacts.numberOfFloors}
                    onChange={factNumberHandler('numberOfFloors', 200)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nearest Airport Distance</label>
                  <input
                    type="text"
                    maxLength={LIMITS.distance}
                    className={inputBase}
                    placeholder="e.g. 15 km (30 mins drive)"
                    value={form.helpfulFacts.airportDistanceKm}
                    onChange={(e) => setFact('airportDistanceKm', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Railway Station Distance</label>
                  <input
                    type="text"
                    maxLength={LIMITS.distance}
                    className={inputBase}
                    placeholder="e.g. 4 km (10 mins drive)"
                    value={form.helpfulFacts.railwayStationDistanceKm}
                    onChange={(e) => setFact('railwayStationDistanceKm', e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-6 mt-4">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(form.helpfulFacts.coupleFriendly)}
                    onChange={(e) => setFact('coupleFriendly', e.target.checked)}
                    className="rounded"
                  />
                  <span>Couple Friendly Property</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={Boolean(form.helpfulFacts.petFriendly)}
                    onChange={(e) => setFact('petFriendly', e.target.checked)}
                    className="rounded"
                  />
                  <span>Pet Friendly</span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 space-y-3">
              <h3 className="text-sm font-bold text-slate-900">Map & Landmark</h3>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Prominent Landmark</label>
                <input
                  type="text"
                  maxLength={LIMITS.landmark}
                  className={inputBase}
                  placeholder="e.g. Opposite Beachfront Promenade"
                  value={form.address.landmark}
                  onChange={(e) => setAddress('landmark', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Google Maps Embed URL</label>
                <input
                  type="url"
                  maxLength={LIMITS.mapUrl}
                  className={`${inputBase} font-mono`}
                  placeholder="https://maps.google.com/maps?q=...&output=embed"
                  value={form.address.mapEmbedUrl}
                  onChange={(e) => setAddress('mapEmbedUrl', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  In Google Maps choose Share, then Embed a map, and paste only the link from the iframe's src.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: FAQS & POLICIES */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-900">Frequently Asked Questions</h3>
                <button
                  type="button"
                  onClick={addFaq}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} /> Add FAQ
                </button>
              </div>

              <div className="space-y-3">
                {form.faqs.map((faq, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 relative">
                    <button
                      type="button"
                      onClick={() => removeFaq(idx)}
                      className="absolute top-3 right-3 text-slate-400 hover:text-rose-600"
                      aria-label="Remove FAQ"
                    >
                      <Trash2 size={14} />
                    </button>
                    <input
                      type="text"
                      maxLength={LIMITS.question}
                      placeholder="Question, e.g. What time is check-in?"
                      className="w-11/12 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={faq.question}
                      onChange={(e) => updateFaq(idx, 'question', e.target.value)}
                    />
                    <textarea
                      rows={2}
                      maxLength={LIMITS.answer}
                      placeholder="Answer"
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={faq.answer}
                      onChange={(e) => updateFaq(idx, 'answer', e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-slate-900">Property Rules & Guidelines</h3>
                <button
                  type="button"
                  onClick={() => addArrayItem('propertyPolicies')}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                >
                  <Plus size={14} /> Add Policy
                </button>
              </div>

              <div className="space-y-2">
                {form.propertyPolicies.map((pol, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={LIMITS.item * 2}
                      placeholder="e.g. Check-in from 2 PM, check-out by 11 AM"
                      className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                      value={pol}
                      onChange={(e) => updateArrayItem('propertyPolicies', idx, e.target.value)}
                    />
                    <button type="button" onClick={() => removeArrayItem('propertyPolicies', idx)} className="text-slate-400 hover:text-rose-600" aria-label="Remove policy">
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ANNOUNCEMENTS */}
        {activeTab === 'announcement' && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
              <input
                type="checkbox"
                checked={Boolean(form.announcement.enabled)}
                onChange={(e) => setAnnouncement('enabled', e.target.checked)}
                className="rounded"
              />
              <span>Display Top Notice / Announcement Banner in Widget</span>
            </label>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-700">Banner Announcement Text</label>
                <span className="text-[11px] text-slate-400">
                  {form.announcement.text.length}/{LIMITS.announcement}
                </span>
              </div>
              <textarea
                rows={3}
                maxLength={LIMITS.announcement}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                placeholder="Special festive discount or welcome perk..."
                value={form.announcement.text}
                onChange={(e) => setAnnouncement('text', e.target.value)}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-70"
        >
          {loading ? 'Saving Content...' : 'Save Property Details'}
        </button>
      </form>
    </div>
  );
}