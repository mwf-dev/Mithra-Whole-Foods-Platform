import { Leaf, Users, ShieldCheck, Truck } from 'lucide-react';

export function TrustStrip() {
  const trustItems = [
    { 
      icon: <Leaf size={32} className="text-[#4A5D23]" />, 
      title: '100% Natural',
      desc: 'No artificial colors, flavors or preservatives'
    },
    { 
      icon: <Users size={32} className="text-[#4A5D23]" />, 
      title: 'Direct From Farmers',
      desc: 'Supporting local farmers and communities'
    },
    { 
      icon: <ShieldCheck size={32} className="text-[#4A5D23]" />, 
      title: 'Premium Quality',
      desc: 'Carefully sourced and quality checked'
    },
    { 
      icon: <Truck size={32} className="text-[#4A5D23]" />, 
      title: 'Fast & Safe Delivery',
      desc: 'Quick delivery to your doorstep'
    },
  ];

  return (
    <section className="bg-white py-12 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustItems.map((item, i) => (
            <div key={i} className="flex items-start gap-4 p-4">
              <div className="shrink-0 p-2 bg-[#F3F7F4] rounded-full">
                {item.icon}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-gray-900 text-base mb-1">{item.title}</span>
                <span className="text-gray-500 text-xs leading-relaxed max-w-[200px]">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
