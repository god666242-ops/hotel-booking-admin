"use client";

import { useState, useEffect, useRef } from "react";
import { fetchWithAuth } from "../../../lib/api";
import {
  BedDouble,
  Plus,
  Users,
  Trash2,
  Edit2,
  X,
  Image as ImageIcon,
  UploadCloud,
  Loader2,
  AlertCircle,
} from "lucide-react";

const INITIAL_FORM = {
  name: "",
  description: "",
  basePrice: "",
  totalUnits: "",
  baseOccupancy: 2,
  maxOccupancy: 3,
  extraAdultRate: 0,
  taxPercent: "",
  amenities: "Free High-Speed Wi-Fi, King Bed, AC, Balcony, Coffee Maker",
  photos: [],
};

// Stops "-", "+" and "e" from being typed into number inputs
const blockInvalidKeys = (e) => {
  if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(INITIAL_FORM);
  const [formError, setFormError] = useState("");
  const fileInputRef = useRef(null);

  const loadRooms = async () => {
    try {
      const res = await fetchWithAuth("/rooms");
      setRooms(res.data || []);
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const handleOpenCreate = () => {
    setEditingRoomId(null);
    setForm(INITIAL_FORM);
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEdit = (room) => {
    setEditingRoomId(room._id);
    setFormError("");
    setForm({
      name: room.name || "",
      description: room.description || "",
      basePrice: room.basePrice ?? "",
      totalUnits: room.totalUnits ?? "",
      baseOccupancy: room.baseOccupancy ?? 2,
      maxOccupancy: room.maxOccupancy ?? 3,
      extraAdultRate: room.extraAdultRate ?? 0,
      taxPercent:
        room.taxPercent !== null && room.taxPercent !== undefined
          ? room.taxPercent
          : "",
      amenities: Array.isArray(room.amenities)
        ? room.amenities.join(", ")
        : "Free High-Speed Wi-Fi, King Bed, AC",
      photos: Array.isArray(room.photos) ? room.photos : [],
    });
    setShowModal(true);
  };

  // Accepts only empty or non-negative values (whole numbers when integer = true)
  const handleNumberChange =
    (key, integer = false) =>
    (e) => {
      const val = e.target.value;
      if (val === "") {
        setForm((prev) => ({ ...prev, [key]: "" }));
        return;
      }
      const n = Number(val);
      if (Number.isNaN(n) || n < 0) return;
      if (integer && !Number.isInteger(n)) return;
      setForm((prev) => ({ ...prev, [key]: val }));
    };

  // ── Multi-file upload handler ──
  const handleFilesSelected = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Check remaining allowed photos (max 8)
    const availableSlots = 8 - form.photos.length;
    if (availableSlots <= 0) {
      alert("You can upload a maximum of 8 photos per room category.");
      return;
    }

    const filesToUpload = files.slice(0, availableSlots);
    const formData = new FormData();
    filesToUpload.forEach((file) => formData.append("images", file));
    formData.append("folder", "rooms");

    setUploading(true);
    try {
      // Uses the centralized fetchWithAuth which properly injects `hbe_token`
      const data = await fetchWithAuth("/upload/images", {
        method: "POST",
        body: formData,
      });

      if (data.urls && data.urls.length > 0) {
        setForm((prev) => ({
          ...prev,
          photos: [...prev.photos, ...data.urls],
        }));
      }
    } catch (err) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = (index) => {
    setForm((prev) => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index),
    }));
  };

  const validateForm = () => {
    const basePrice = Number(form.basePrice);
    const totalUnits = Number(form.totalUnits);
    const baseOcc = Number(form.baseOccupancy);
    const maxOcc = Number(form.maxOccupancy);
    const extra = Number(form.extraAdultRate) || 0;

    if (!(basePrice > 0)) return "Base price must be greater than 0.";
    if (!Number.isInteger(totalUnits) || totalUnits < 1)
      return "Total units must be a whole number, 1 or more.";
    if (!Number.isInteger(baseOcc) || baseOcc < 1)
      return "Base guests must be a whole number, 1 or more.";
    if (!Number.isInteger(maxOcc) || maxOcc < 1)
      return "Max capacity must be a whole number, 1 or more.";
    if (maxOcc < baseOcc)
      return "Max capacity cannot be lower than base guests.";
    if (extra < 0) return "Extra adult rate cannot be negative.";
    if (form.taxPercent !== "") {
      const tax = Number(form.taxPercent);
      if (Number.isNaN(tax) || tax < 0 || tax > 100)
        return "Tax percent must be between 0 and 100.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }

    setFormError("");
    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        basePrice: Number(form.basePrice),
        totalUnits: Number(form.totalUnits),
        baseOccupancy: Number(form.baseOccupancy),
        maxOccupancy: Number(form.maxOccupancy),
        extraAdultRate: Number(form.extraAdultRate) || 0,
        taxPercent: form.taxPercent === "" ? null : Number(form.taxPercent),
        amenities: form.amenities
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        photos: form.photos.filter(Boolean),
      };

      if (editingRoomId) {
        await fetchWithAuth(`/rooms/${editingRoomId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });
      } else {
        await fetchWithAuth("/rooms", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      setShowModal(false);
      setEditingRoomId(null);
      setForm(INITIAL_FORM);
      await loadRooms();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to deactivate this room category?"))
      return;
    try {
      await fetchWithAuth(`/rooms/${id}`, { method: "DELETE" });
      await loadRooms();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Room Categories
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Upload room photos, configure tariffs, and manage available
            inventory
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition shadow-sm"
        >
          <Plus size={16} />
          <span>Add New Room Type</span>
        </button>
      </div>

      {/* Room Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => {
          const primaryPhoto =
            room.photos?.[0] ||
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80";

          return (
            <div
              key={room._id}
              className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                  <img
                    src={primaryPhoto}
                    alt={room.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src =
                        "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80";
                    }}
                  />
                  <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xs">
                    <ImageIcon size={12} />
                    <span>{room.photos?.length || 0} photos</span>
                  </div>
                  <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-xs text-slate-900 text-xs font-bold px-2.5 py-1 rounded-lg shadow-xs">
                    {room.totalUnits} Units
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="font-bold text-slate-900 text-lg tracking-tight mb-1">
                    {room.name}
                  </h3>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {room.description ||
                      "Spacious, well-appointed hotel room with premium amenities."}
                  </p>

                  <div className="p-3 bg-slate-50 rounded-xl mb-4 flex items-baseline justify-between border border-slate-100">
                    <span className="text-xs font-medium text-slate-500">
                      Base Tariff
                    </span>
                    <div className="text-xl font-extrabold text-slate-900">
                      ₹{room.basePrice?.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-normal text-slate-400">
                        / night
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-slate-600 mb-2">
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400 shrink-0" />
                      <span>
                        Base {room.baseOccupancy} Guests (Max{" "}
                        {room.maxOccupancy})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {room.amenities?.slice(0, 4).map((a, i) => (
                        <span
                          key={i}
                          className="bg-slate-100 text-slate-600 text-[11px] px-2 py-0.5 rounded-md"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(room)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition"
                >
                  <Edit2 size={13} className="text-slate-500" />
                  <span>Edit Room</span>
                </button>
                <button
                  onClick={() => handleDelete(room._id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-semibold transition"
                >
                  <Trash2 size={13} />
                  <span>Deactivate</span>
                </button>
              </div>
            </div>
          );
        })}

        {rooms.length === 0 && (
          <div className="col-span-full bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <BedDouble size={36} className="mx-auto text-slate-400 mb-3" />
            <h3 className="font-bold text-slate-900 text-base">
              No room types configured
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-5">
              Create your first room category with uploaded photos so guests can
              view real accommodations.
            </p>
            <button
              onClick={handleOpenCreate}
              className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition"
            >
              Add Room Category
            </button>
          </div>
        )}
      </div>

      {/* Modal with File Upload */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingRoomId
                    ? "Update Room Category"
                    : "Add New Room Category"}
                </h2>
                <p className="text-xs text-slate-400">
                  Upload images and configure pricing for the customer booking
                  drawer.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Room Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deluxe Ocean Suite"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Spacious room with king bed, balcony, and scenic ocean views..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Base Price (₹ / night)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    placeholder="3500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={form.basePrice}
                    onChange={handleNumberChange("basePrice")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Total Units Count
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    placeholder="6"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={form.totalUnits}
                    onChange={handleNumberChange("totalUnits", true)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Base Guests
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={form.baseOccupancy}
                    onChange={handleNumberChange("baseOccupancy", true)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Max Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min={form.baseOccupancy || 1}
                    step="1"
                    inputMode="numeric"
                    onKeyDown={blockInvalidKeys}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                    value={form.maxOccupancy}
                    onChange={handleNumberChange("maxOccupancy", true)}
                  />
                </div>
              </div>

              {/* ── Photo Uploader Section ── */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Upload Room Photos
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {form.photos.length}/8 photo(s)
                  </span>
                </div>

                <input
                  type="file"
                  multiple
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFilesSelected}
                  className="hidden"
                />

                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50/70 hover:bg-slate-50 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    uploading ? "opacity-50 pointer-events-none" : ""
                  }`}
                >
                  {uploading ? (
                    <>
                      <Loader2
                        size={24}
                        className="text-slate-600 animate-spin"
                      />
                      <span className="text-xs font-semibold text-slate-700">
                        Uploading to cloud storage...
                      </span>
                    </>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600">
                        <UploadCloud size={20} />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 block">
                          Click to browse and upload photos
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Supports JPG, PNG, WEBP up to 10MB each (max 8 images)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Uploaded Thumbnails Tray */}
                {form.photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/80 mt-3">
                    {form.photos.map((url, idx) => (
                      <div
                        key={idx}
                        className="relative group aspect-square rounded-lg overflow-hidden bg-slate-200 border border-slate-300"
                      >
                        <img
                          src={url}
                          alt={`Uploaded room photo ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-md opacity-90 hover:opacity-100 transition shadow-xs"
                          title="Remove photo"
                        >
                          <Trash2 size={11} />
                        </button>
                        <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1 rounded font-mono">
                          #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Amenities (comma-separated)
                </label>
                <input
                  type="text"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                  value={form.amenities}
                  onChange={(e) =>
                    setForm({ ...form, amenities: e.target.value })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || uploading}
                  className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition disabled:opacity-70"
                >
                  {loading
                    ? editingRoomId
                      ? "Saving Changes..."
                      : "Creating..."
                    : editingRoomId
                      ? "Update Room Category"
                      : "Create Room Type"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
