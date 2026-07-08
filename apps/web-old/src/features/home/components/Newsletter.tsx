export function Newsletter() {
  return (
    <section className="bg-[#F8F9F5] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-[#F3F6EB] rounded-3xl p-8 md:p-12 relative overflow-hidden">
          
          <div className="flex-1 z-10">
            <h2 className="text-2xl md:text-3xl font-bold font-playfair mb-2 text-gray-900">Stay Healthy. Stay Updated.</h2>
            <p className="text-gray-600 text-sm md:text-base max-w-sm">
              Subscribe to get special offers, healthy tips and latest product updates.
            </p>
          </div>

          <div className="flex-1 w-full md:w-auto z-10">
            <form className="flex w-full max-w-md mx-auto md:ml-auto">
              <input 
                type="email" 
                placeholder="Enter your email address" 
                className="flex-1 py-3 px-6 rounded-l-full border-none focus:ring-2 focus:ring-[#4A5D23] outline-none text-sm"
              />
              <button 
                type="submit" 
                className="bg-[#4A5D23] text-white px-6 md:px-8 py-3 rounded-r-full font-bold text-sm hover:bg-[#3A4A1A] transition-colors"
              >
                Subscribe
              </button>
            </form>
          </div>

          {/* Right Image Decoration */}
          <div 
            className="absolute right-0 bottom-0 w-64 h-64 bg-contain bg-bottom bg-no-repeat opacity-50 md:opacity-100 z-0 mix-blend-multiply"
            style={{ backgroundImage: "url('https://placehold.co/400x300/f3f6eb/4a5d23?text=Baskets')" }}
          ></div>
        </div>
      </div>
    </section>
  );
}
