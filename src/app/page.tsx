export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-6">
          CU-BEMS IoT Platform
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Building Energy Management System - IoT Transmission Failure Analysis
        </p>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">
            Bangkok Dataset Analysis
          </h2>
          <p className="text-gray-600 mb-4">
            Analyze energy consumption patterns from 134 IoT sensors across 18 months 
            of building operations data.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800">Sensors</h3>
              <p className="text-2xl font-bold text-blue-600">134</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-800">Data Points</h3>
              <p className="text-2xl font-bold text-green-600">4.6M+</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="font-semibold text-purple-800">Timeline</h3>
              <p className="text-2xl font-bold text-purple-600">18 Months</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}