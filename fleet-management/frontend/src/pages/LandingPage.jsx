import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  MapPin, Navigation, Shield, Zap, Users, BarChart3, 
  Clock, Smartphone, ChevronRight, Check, Menu, X
} from 'lucide-react';

export default function LandingPage() {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const features = [
    { icon: MapPin, title: t('landing_feature_realtime'), desc: t('landing_feature_realtime_desc') },
    { icon: Navigation, title: t('landing_feature_routes'), desc: t('landing_feature_routes_desc') },
    { icon: Shield, title: t('landing_feature_geofencing'), desc: t('landing_feature_geofencing_desc') },
    { icon: Zap, title: t('landing_feature_behavior'), desc: t('landing_feature_behavior_desc') },
    { icon: Users, title: t('landing_feature_drivers'), desc: t('landing_feature_drivers_desc') },
    { icon: BarChart3, title: t('landing_feature_analytics'), desc: t('landing_feature_analytics_desc') },
  ];

  const steps = [
    { num: '01', title: t('landing_step1_title'), desc: t('landing_step1_desc') },
    { num: '02', title: t('landing_step2_title'), desc: t('landing_step2_desc') },
    { num: '03', title: t('landing_step3_title'), desc: t('landing_step3_desc') },
  ];

  const plans = [
    { name: t('landing_plan_starter'), price: '49', features: [`Up to 10 ${t('landing_plan_vehicles')}`, t('landing_plan_realtime_tracking'), t('landing_plan_basic_reports'), t('landing_plan_email_support')] },
    { name: t('landing_plan_professional'), price: '99', features: [`Up to 50 ${t('landing_plan_vehicles')}`, t('landing_plan_realtime_tracking'), t('landing_plan_advanced_analytics'), t('landing_plan_geofencing'), t('landing_plan_priority_support'), t('landing_plan_api_access')], popular: true },
    { name: t('landing_plan_enterprise'), price: '199', features: [`Unlimited ${t('landing_plan_vehicles')}`, t('landing_plan_realtime_tracking'), t('landing_plan_advanced_analytics'), t('landing_plan_geofencing'), t('landing_plan_custom_integrations'), t('landing_plan_24_7_support'), t('landing_plan_account_manager')] },
  ];

  return (
    <div className="min-h-screen bg-[#060d1a]">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#060d1a]/80 backdrop-blur-xl border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">FleetTrack</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_features')}</a>
              <a href="#how-it-works" className="text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_how')}</a>
              <a href="#pricing" className="text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_pricing')}</a>
              <Link to="/login" className="text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_login')}</Link>
              <Link to="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                {t('landing_nav_get_started')}
              </Link>
            </div>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-white">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-[#060d1a] border-b border-slate-800/50 px-4 py-4 space-y-3">
            <a href="#features" className="block text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_features')}</a>
            <a href="#how-it-works" className="block text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_how')}</a>
            <a href="#pricing" className="block text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_pricing')}</a>
            <Link to="/login" className="block text-slate-400 hover:text-white transition-colors text-sm">{t('landing_nav_login')}</Link>
            <Link to="/login" className="block bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors text-center">
              {t('landing_nav_get_started')}
            </Link>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2 mb-6">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">{t('landing_available_oman')}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              {t('landing_hero_title')}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400"> {t('landing_hero_subtitle')}</span>
            </h1>
            <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
              {t('landing_hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/login" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-all flex items-center justify-center gap-2">
                {t('landing_start_trial')}
                <ChevronRight size={18} />
              </Link>
              <a href="#features" className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-3 rounded-xl font-medium transition-all border border-slate-700">
                {t('landing_learn_more')}
              </a>
            </div>
          </div>

          {/* Hero Image/Preview */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[#060d1a] via-transparent to-transparent z-10" />
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 p-4 backdrop-blur-sm">
              <div className="bg-[#0a1424] rounded-xl overflow-hidden aspect-video flex items-center justify-center">
                <div className="text-center">
                  <MapPin size={64} className="text-emerald-500 mx-auto mb-4 opacity-50" />
                  <p className="text-slate-500">Interactive Dashboard Preview</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing_powerful_features')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('landing_features_desc')}</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-4 group-hover:bg-emerald-500/20 transition-colors">
                  <feature.icon size={24} className="text-emerald-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing_how_title')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('landing_how_desc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-bold text-emerald-500/20 mb-4">{step.num}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{step.title}</h3>
                <p className="text-slate-400">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing_pricing_title')}</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">{t('landing_pricing_desc')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <div key={index} className={`bg-slate-900/50 border rounded-2xl p-8 ${plan.popular ? 'border-emerald-500 relative' : 'border-slate-800'}`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-medium px-3 py-1 rounded-full">
                    {t('landing_most_popular')}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-slate-400">{t('landing_plan_per_month')}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-slate-300 text-sm">
                      <Check size={16} className="text-emerald-400 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to="/login" className={`block text-center py-3 rounded-xl font-medium transition-colors ${plan.popular ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
                  {t('landing_nav_get_started')}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-500/10 to-transparent">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">{t('landing_cta_title')}</h2>
          <p className="text-slate-400 mb-8">{t('landing_cta_desc')}</p>
          <Link to="/login" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-medium transition-all">
            {t('landing_start_trial')}
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
                <MapPin size={18} className="text-white" />
              </div>
              <span className="text-white font-bold">FleetTrack</span>
            </div>
            <p className="text-slate-500 text-sm">{t('landing_footer_rights')}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
