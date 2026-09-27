'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { projectsApi } from '@/lib/api';
import type { RegulatoryAnalysisResult } from '@/types/api';
import {
  Building2,
  Briefcase,
  MapPin,
  Sliders,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Zap,
  Clock,
  FileText,
  AlertTriangle,
  Gift,
  Loader2,
  ShieldCheck,
  Factory,
  Layers,
  Sparkles,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';

interface WizardFormData {
  // Step 1: Entity
  entity_name: string;
  entity_type: string;
  entity_sector: string;
  // Step 2: Project Proposal
  name: string;
  type: string;
  sector: string;
  investment_amount: number;
  employee_count: number;
  stage: string;
  target_start_date: string;
  // Step 3: Location
  district: string;
  industrial_area: string;
  industrial_area_name: string;
  address: string;
  // Step 4: Regulatory Attributes
  pollution_category: string;
  water_usage_kld: string;
  power_requirement_kva: string;
  land_area_sqm: string;
  building_type: string;
  product_type: string;
  waste_type: string;
  contract_labour: string;
}

const INITIAL_DATA: WizardFormData = {
  entity_name: 'Sahyadri Agro Industries Pvt Ltd',
  entity_type: 'Private Limited Company',
  entity_sector: 'Food Processing',
  name: 'Sahyadri Integrated Agro Processing Facility',
  type: 'Manufacturing',
  sector: 'Food Processing',
  investment_amount: 300000000, // ₹30 Cr
  employee_count: 85,
  stage: 'pre_establishment',
  target_start_date: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
  district: 'Pune',
  industrial_area: 'MIDC',
  industrial_area_name: 'MIDC Chakan Phase II',
  address: 'Plot No. C-15, Industrial Corridor, MIDC Chakan, Pune 410501, Maharashtra',
  pollution_category: 'red',
  water_usage_kld: '45',
  power_requirement_kva: '400',
  land_area_sqm: '5500',
  building_type: 'industrial',
  product_type: 'processed_food_and_beverages',
  waste_type: 'effluent',
  contract_labour: 'yes',
};

const STEPS = [
  { id: 1, name: 'Applicant Entity', icon: Building2, desc: 'Enterprise & legal registration' },
  { id: 2, name: 'Project Proposal', icon: Briefcase, desc: 'Scope, capital & employment' },
  { id: 3, name: 'Location & Context', icon: MapPin, desc: 'District, MIDC & site coordinates' },
  { id: 4, name: 'Regulatory Attributes', icon: Sliders, desc: 'Pollution, utilities & operations' },
  { id: 5, name: 'Permissions Engine', icon: Sparkles, desc: 'Statutory evaluation roadmap' },
];

export default function NewProjectWizardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<WizardFormData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<RegulatoryAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const updateField = (field: keyof WizardFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleNextStep = async () => {
    setErrorMsg(null);

    // Validation per step
    if (step === 1) {
      if (!formData.entity_name.trim()) {
        setErrorMsg('Please provide the legal name of the applicant entity.');
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!formData.name.trim()) {
        setErrorMsg('Please enter a name for your investment proposal / unit.');
        return;
      }
      if (formData.investment_amount <= 0) {
        setErrorMsg('Investment amount must be greater than zero.');
        return;
      }
      if (formData.employee_count <= 0) {
        setErrorMsg('Proposed employee count must be at least 1.');
        return;
      }
      setStep(3);
    } else if (step === 3) {
      if (!formData.district.trim()) {
        setErrorMsg('Please select a district.');
        return;
      }
      setStep(4);
    } else if (step === 4) {
      // Create project + save attributes, then advance to step 5 for analysis
      setIsSubmitting(true);
      try {
        const projectPayload = {
          name: formData.name,
          type: formData.type,
          sector: formData.sector,
          investment_amount: Number(formData.investment_amount),
          employee_count: Number(formData.employee_count),
          stage: formData.stage,
          district: formData.district,
          industrial_area: formData.industrial_area,
          address: formData.address,
          target_start_date: formData.target_start_date ? new Date(formData.target_start_date) : undefined,
          entity_name: formData.entity_name,
          entity_type: formData.entity_type,
        };

        const project = await projectsApi.create(projectPayload);
        setCreatedProjectId(project.id);

        const attributesPayload: Record<string, string> = {
          pollution_category: formData.pollution_category,
          water_usage_kld: formData.water_usage_kld,
          power_requirement_kva: formData.power_requirement_kva,
          land_area_sqm: formData.land_area_sqm,
          building_type: formData.building_type,
          product_type: formData.product_type,
          waste_type: formData.waste_type,
          contract_labour: formData.contract_labour,
          industrial_area: formData.industrial_area,
          state: 'maharashtra',
        };

        await projectsApi.saveAttributes(project.id, attributesPayload);

        setStep(5);
        // Automatically trigger regulatory analysis
        await runAnalysis(project.id);
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to initialize investment proposal. Please check your entries.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const runAnalysis = async (projectId: string) => {
    setIsAnalyzing(true);
    setErrorMsg(null);
    try {
      const result = await projectsApi.runRegulatoryAnalysis(projectId);
      setAnalysisResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Regulatory analysis encountered an issue. You can retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFinish = () => {
    if (createdProjectId) {
      router.push(`/app/projects/${createdProjectId}`);
    } else {
      router.push('/app/projects');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary-700 tracking-wide uppercase">
            <span>Udyog Setu Single Window</span>
            <span>•</span>
            <span>New Project Onboarding Wizard</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">Register New Investment Proposal</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure your undertaking profile to generate an instant statutory permissions & approvals roadmap.
          </p>
        </div>
        <Link href="/app/projects" className="btn-secondary self-start sm:self-auto text-xs">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Proposals
        </Link>
      </div>

      {/* Stepper Header */}
      <div className="card p-4 bg-white border border-gray-100 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.id;
            const isCurrent = step === s.id;

            return (
              <div
                key={s.id}
                className={`flex items-start gap-2.5 p-2 rounded-xl transition-all ${
                  isCurrent
                    ? 'bg-primary-50/70 border border-primary-200'
                    : isCompleted
                    ? 'bg-gray-50/70 text-gray-600'
                    : 'opacity-50 text-gray-400'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    isCurrent
                      ? 'bg-primary-600 text-white'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <div className="min-w-0">
                  <p
                    className={`text-xs font-semibold truncate ${
                      isCurrent ? 'text-primary-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {s.name}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate hidden sm:block">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center gap-3 animate-fade-in">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="flex-1">{errorMsg}</p>
        </div>
      )}

      {/* Step Contents */}
      <div className="card p-6 sm:p-8 bg-white border border-gray-100 shadow-sm">
        {/* STEP 1: Applicant Entity */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary-600" />
                  Step 1: Applicant Entity Information
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Identify the legal business entity establishing or operating this industrial project.
                </p>
              </div>
              <span className="badge bg-primary-50 text-primary-700 border border-primary-200">
                Verified Single Window Identity
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Legal Entity / Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={formData.entity_name}
                  onChange={(e) => updateField('entity_name', e.target.value)}
                  placeholder="e.g. Sahyadri Agro Industries Pvt Ltd"
                />
                <p className="text-[11px] text-gray-400 mt-1">Must match Certificate of Incorporation / GSTIN</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Entity Legal Structure <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.entity_type}
                  onChange={(e) => updateField('entity_type', e.target.value)}
                >
                  <option value="Private Limited Company">Private Limited Company</option>
                  <option value="Public Limited Company">Public Limited Company</option>
                  <option value="Limited Liability Partnership">Limited Liability Partnership (LLP)</option>
                  <option value="Partnership Firm">Partnership Firm</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Joint Venture">Joint Venture</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Primary Sector / Industry <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.entity_sector}
                  onChange={(e) => {
                    updateField('entity_sector', e.target.value);
                    updateField('sector', e.target.value);
                  }}
                >
                  <option value="Food Processing">Food Processing & Agro-Industries</option>
                  <option value="Manufacturing">General Engineering & Manufacturing</option>
                  <option value="Chemicals & Petrochemicals">Chemicals & Specialty Materials</option>
                  <option value="Pharmaceuticals">Pharmaceuticals & Healthcare</option>
                  <option value="Textiles & Garments">Textiles & Apparel</option>
                  <option value="Electronics & IT">Electronics, ESDM & IT Hardware</option>
                  <option value="Automotive">Automotive & Components</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Authorized Signatory / Representative
                </label>
                <div className="flex items-center gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-700">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span className="font-medium text-gray-900">{user?.name ?? 'Authorized Investor'}</span>
                  <span className="text-gray-400">({user?.email ?? 'verified'})</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Authenticated user acting on behalf of the applicant</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Project / Investment Proposal */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary-600" />
                  Step 2: Investment Proposal & Parameters
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Specify proposal capital investment, employment potential and manufacturing profile.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Project / Industrial Unit Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={formData.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Sahyadri Integrated Agro Processing Facility"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Proposal Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.type}
                  onChange={(e) => updateField('type', e.target.value)}
                >
                  <option value="Manufacturing">New Manufacturing Unit (Greenfield)</option>
                  <option value="Expansion">Substantial Expansion of Existing Unit</option>
                  <option value="Diversification">Diversification into New Product Line</option>
                  <option value="Modernisation">Technology Upgradation / Modernisation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industrial Sector <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className="input-base bg-gray-50"
                  value={formData.sector}
                  readOnly
                />
                <p className="text-[11px] text-gray-400 mt-1">Inherited from enterprise entity registration</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Proposed Capital Investment (in ₹ INR) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.investment_amount}
                  onChange={(e) => updateField('investment_amount', Number(e.target.value))}
                  min={100000}
                  step={1000000}
                />
                <p className="text-[11px] text-primary-700 font-semibold mt-1">
                  Formatted: {formatCurrency(formData.investment_amount)}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Proposed Direct Employment (Workers & Staff) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.employee_count}
                  onChange={(e) => updateField('employee_count', Number(e.target.value))}
                  min={1}
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Headcounts ≥ 10 trigger Factory License; ≥ 20 trigger Contract Labour rules
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Project Lifecycle Stage <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.stage}
                  onChange={(e) => updateField('stage', e.target.value)}
                >
                  <option value="pre_establishment">Pre-Establishment (Land, Consent to Establish, NOCs)</option>
                  <option value="pre_operation">Pre-Operation (Consent to Operate, Utilities, Licenses)</option>
                  <option value="operational">Operational Unit (Ongoing Clearances & Renewals)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Target Commercial Commencement Date
                </label>
                <input
                  type="date"
                  className="input-base"
                  value={formData.target_start_date}
                  onChange={(e) => updateField('target_start_date', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Location & Industrial Context */}
        {step === 3 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  Step 3: Location & Industrial Jurisdiction
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Jurisdiction determines the concerned MIDC, municipal, and regional authorities.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">State Jurisdiction</label>
                <input
                  type="text"
                  className="input-base bg-gray-50"
                  value="Maharashtra (MAITRI / NSWS State Portal)"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  District <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.district}
                  onChange={(e) => updateField('district', e.target.value)}
                >
                  <option value="Pune">Pune</option>
                  <option value="Thane">Thane</option>
                  <option value="Raigad">Raigad</option>
                  <option value="Nashik">Nashik</option>
                  <option value="Aurangabad">Chhatrapati Sambhajinagar (Aurangabad)</option>
                  <option value="Nagpur">Nagpur</option>
                  <option value="Kolhapur">Kolhapur</option>
                  <option value="Solapur">Solapur</option>
                  <option value="Palghar">Palghar</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industrial Zone Type <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.industrial_area}
                  onChange={(e) => updateField('industrial_area', e.target.value)}
                >
                  <option value="MIDC">MIDC Notified Industrial Area</option>
                  <option value="Non-MIDC">Non-MIDC Freehold / Private Industrial Land</option>
                  <option value="SEZ">Special Economic Zone (SEZ)</option>
                  <option value="Cooperative">Cooperative Industrial Estate</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">
                  MIDC projects benefit from single-window water and power allotment
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industrial Area / Estate Name
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={formData.industrial_area_name}
                  onChange={(e) => updateField('industrial_area_name', e.target.value)}
                  placeholder="e.g. MIDC Chakan Phase II"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Plot Number & Site Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  className="input-base"
                  value={formData.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  placeholder="Plot No., Sector, Industrial Area, Taluka, Pin Code"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Business / Regulatory Attributes */}
        {step === 4 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-primary-600" />
                  Step 4: Regulatory & Technical Attributes
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  These technical indicators power the statutory rule engine to determine applicable licenses.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Pollution Index Category (CPCB / MPCB Classification) <span className="text-red-500">*</span>
                </label>
                <select
                  className="input-base"
                  value={formData.pollution_category}
                  onChange={(e) => updateField('pollution_category', e.target.value)}
                >
                  <option value="red">Red Category (Pollution Index ≥ 60 - Heavy Industries, Effluents)</option>
                  <option value="orange">Orange Category (Pollution Index 41-59 - Moderate Impact)</option>
                  <option value="green">Green Category (Pollution Index 21-40 - Low Impact)</option>
                  <option value="white">White Category (Pollution Index &lt; 20 - Non-polluting)</option>
                </select>
                <p className="text-[11px] text-gray-400 mt-1">Red & Orange categories require MPCB Consent to Establish</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Water Usage Requirement (Kilo-Litres per Day - KLD)
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.water_usage_kld}
                  onChange={(e) => updateField('water_usage_kld', e.target.value)}
                  placeholder="e.g. 45"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Connected Power Load (kVA)
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.power_requirement_kva}
                  onChange={(e) => updateField('power_requirement_kva', e.target.value)}
                  placeholder="e.g. 400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Total Land / Built-up Area (Square Metres)
                </label>
                <input
                  type="number"
                  className="input-base"
                  value={formData.land_area_sqm}
                  onChange={(e) => updateField('land_area_sqm', e.target.value)}
                  placeholder="e.g. 5500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industrial Building Type
                </label>
                <select
                  className="input-base"
                  value={formData.building_type}
                  onChange={(e) => updateField('building_type', e.target.value)}
                >
                  <option value="industrial">Standard Industrial Factory Shed</option>
                  <option value="warehouse">Logistics Warehouse / Silo</option>
                  <option value="commercial">Commercial / Processing Complex</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Industrial Waste / Effluent Generation
                </label>
                <select
                  className="input-base"
                  value={formData.waste_type}
                  onChange={(e) => updateField('waste_type', e.target.value)}
                >
                  <option value="effluent">Industrial Effluent (Trade Waste requiring ETP)</option>
                  <option value="solid_waste">Non-hazardous Solid Waste</option>
                  <option value="hazardous">Hazardous / Chemical Waste</option>
                  <option value="none">Negligible / Domestic Sewage Only</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Contract Labour Engagement (≥ 20 Workers)
                </label>
                <select
                  className="input-base"
                  value={formData.contract_labour}
                  onChange={(e) => updateField('contract_labour', e.target.value)}
                >
                  <option value="yes">Yes — Contractor Labour Act applies</option>
                  <option value="no">No — Exclusively permanent rolls</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Key Product Description
                </label>
                <input
                  type="text"
                  className="input-base"
                  value={formData.product_type}
                  onChange={(e) => updateField('product_type', e.target.value)}
                  placeholder="e.g. Fruit Pulp, Puree and Frozen Vegetables"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Regulatory Analysis Result */}
        {step === 5 && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary-600" />
                  Step 5: Personalized Statutory Clearances Roadmap
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Generated by the regulatory knowledge engine matching Maharashtra State industrial rules.
                </p>
              </div>

              {createdProjectId && (
                <button
                  type="button"
                  onClick={() => runAnalysis(createdProjectId)}
                  disabled={isAnalyzing}
                  className="btn-secondary text-xs self-start"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Evaluating Rules...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 text-primary-600" /> Re-run Regulatory Engine
                    </>
                  )}
                </button>
              )}
            </div>

            {isAnalyzing && (
              <div className="p-8 text-center bg-primary-50/40 rounded-2xl border border-primary-100 animate-pulse">
                <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900">Evaluating Project Profile Against State Rules...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Parsing sector applicability, environmental thresholds, fire safety norms, and labor policies.
                </p>
              </div>
            )}

            {!isAnalyzing && analysisResult && (
              <div className="space-y-6">
                {/* Metric Summary Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-xl">
                    <p className="text-xs font-semibold text-emerald-800">Applicable Clearances</p>
                    <p className="text-2xl font-bold text-emerald-900 mt-1">
                      {analysisResult.summary?.total ?? analysisResult.approvals.length}
                    </p>
                    <p className="text-[11px] text-emerald-700 mt-0.5">Mandatory statutory approvals</p>
                  </div>

                  <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-xl">
                    <p className="text-xs font-semibold text-blue-800">Proceed in Parallel Now</p>
                    <p className="text-2xl font-bold text-blue-900 mt-1">
                      {analysisResult.summary?.parallel_count ??
                        analysisResult.approvals.filter((a) => a.can_proceed_in_parallel).length}
                    </p>
                    <p className="text-[11px] text-blue-700 mt-0.5">No prerequisite blockers</p>
                  </div>

                  <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-xl">
                    <p className="text-xs font-semibold text-amber-800">Prerequisites Required</p>
                    <p className="text-2xl font-bold text-amber-900 mt-1">
                      {analysisResult.summary?.prerequisite_dependent_count ??
                        analysisResult.approvals.filter((a) => !a.can_proceed_in_parallel).length}
                    </p>
                    <p className="text-[11px] text-amber-700 mt-0.5">Chained behind initial NOCs</p>
                  </div>

                  <div className="p-4 bg-purple-50/70 border border-purple-200/80 rounded-xl">
                    <p className="text-xs font-semibold text-purple-800">Matched Incentives</p>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {analysisResult.incentives.length}
                    </p>
                    <p className="text-[11px] text-purple-700 mt-0.5">State scheme subsidies</p>
                  </div>
                </div>

                {/* Approvals List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary-600" />
                      Statutory Clearances Identified for this Proposal
                    </h3>
                    <span className="text-xs text-gray-500">
                      Sorted by parallel eligibility & dependency sequence
                    </span>
                  </div>

                  <div className="space-y-3">
                    {analysisResult.approvals.map((approval) => {
                      const reqDocs = analysisResult.documents.filter(
                        (d) => d.approval_type_id === approval.id
                      );

                      return (
                        <div
                          key={approval.id}
                          className="p-4 rounded-xl border border-gray-200 bg-white hover:border-primary-300 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-semibold text-gray-900">{approval.name}</h4>
                                <span className="text-xs font-medium text-gray-500">
                                  ({approval.authority})
                                </span>
                                {approval.can_proceed_in_parallel ? (
                                  <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
                                    Can Proceed in Parallel
                                  </span>
                                ) : (
                                  <span className="badge bg-amber-50 text-amber-700 border border-amber-200">
                                    Requires Prerequisite First
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-600">{approval.description}</p>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 text-xs text-gray-500">
                              <Clock className="w-3.5 h-3.5 text-gray-400" />
                              <span>{approval.default_sla_days ? `${approval.default_sla_days} days SLA` : 'Standard SLA'}</span>
                            </div>
                          </div>

                          {/* Explainable Why this applies */}
                          <div className="mt-3 p-2.5 bg-gray-50 rounded-lg text-xs text-gray-700 border border-gray-100 flex items-start gap-2">
                            <Zap className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold text-gray-900">Why this permission applies: </span>
                              <span>{approval.applicability_reason ?? 'Matched industrial criteria'}</span>
                            </div>
                          </div>

                          {/* Prerequisites if any */}
                          {approval.prerequisites && approval.prerequisites.length > 0 && (
                            <div className="mt-2 text-xs flex items-center gap-1.5 text-amber-800">
                              <span className="font-semibold">Prerequisite:</span>
                              {approval.prerequisites.map((p) => (
                                <span key={p.id} className="bg-amber-100/80 px-2 py-0.5 rounded text-[11px] font-medium">
                                  {p.name}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Required Documents Checklist */}
                          {reqDocs.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <p className="text-[11px] font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
                                <FileText className="w-3 h-3 text-gray-400" /> Required Submission Documents ({reqDocs.length}):
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {reqDocs.map((doc) => (
                                  <span
                                    key={doc.id}
                                    className="inline-flex items-center gap-1 text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                                    {doc.name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Potentially Applicable Incentives */}
                {analysisResult.incentives && analysisResult.incentives.length > 0 && (
                  <div className="p-4 bg-purple-50/50 border border-purple-200/80 rounded-xl space-y-3">
                    <div className="flex items-center gap-2">
                      <Gift className="w-4 h-4 text-purple-600" />
                      <h3 className="text-sm font-bold text-purple-900">
                        Potentially Applicable Incentive Schemes ({analysisResult.incentives.length})
                      </h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analysisResult.incentives.map((inc, i) => (
                        <div key={i} className="p-3 bg-white border border-purple-100 rounded-lg">
                          <p className="text-xs font-semibold text-gray-900">{inc.scheme.name}</p>
                          <p className="text-[11px] text-purple-700 font-medium mt-0.5">
                            Authority: {inc.scheme.authority}
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{inc.scheme.benefit_description}</p>
                          <p className="text-[10px] text-gray-400 mt-2 italic">
                            Match Reason: {inc.reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Wizard Controls Footer */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-gray-100">
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              disabled={isSubmitting}
              className="btn-secondary text-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
            </button>
          ) : (
            <div />
          )}

          {step < 4 ? (
            <button type="button" onClick={handleNextStep} className="btn-primary text-xs">
              Continue to Step {step + 1} <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : step === 4 ? (
            <button
              type="button"
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving & Analyzing...
                </>
              ) : (
                <>
                  Save Proposal & Run Regulatory Engine <Sparkles className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="btn-primary text-xs bg-emerald-600 hover:bg-emerald-700"
            >
              Proceed to Project Control Centre <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
