export function WhyChooseUs() {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="bg-[#F8F9F5] rounded-3xl overflow-hidden flex flex-col md:flex-row h-auto md:h-[400px]">
          
          {/* Left Content */}
          <div className="flex-1 p-10 md:p-16 flex flex-col justify-center">
            <span className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-2">From Our Farms</span>
            <h2 className="text-3xl md:text-4xl font-bold font-playfair mb-4 leading-tight text-gray-900">
              From Local Farms<br/>
              To Your Family
            </h2>
            <p className="text-gray-600 text-sm md:text-base mb-8 max-w-sm leading-relaxed">
              We work directly with farmers who follow sustainable and natural farming practices. Good for you. Good for farmers. Good for Earth.
            </p>
            
            <div>
              <button className="bg-[#4A5D23] text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-[#3A4A1A] transition-colors shadow-lg shadow-[#4A5D23]/20">
                Know Our Farmers
              </button>
            </div>
          </div>

          {/* Right Image Container with Gradient Fade */}
          <div className="w-full md:w-[60%] relative min-h-[300px] md:min-h-full">
             <div 
               className="absolute inset-0 bg-cover bg-center"
               style={{ backgroundImage: "url('https://placehold.co/800x600/4a5d23/ffffff?text=Lush+Green+Farm+Landscape')" }}
             ></div>
             {/* Gradient to blend with left background */}
             <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-[#F8F9F5] to-transparent z-10 hidden md:block"></div>
             <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-[#F8F9F5] to-transparent z-10 md:hidden"></div>
          </div>

        </div>
      </div>
    </section>
  );
}
