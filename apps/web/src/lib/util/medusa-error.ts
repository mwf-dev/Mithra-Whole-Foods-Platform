export default function medusaError(error: any): never {
  console.error("medusaError caught an error:");
  if (error.response) {
    console.error("Response data:", JSON.stringify(error.response.data, null, 2));
  }
  if (error.status) {
    console.error("Status code:", error.status);
    console.error("Error body:", error);
    if (error.message) console.error("Error message:", error.message);
  }
  
  if (error.response) {
    const message = error.response.data.message || error.response.data
    throw new Error(message.charAt(0).toUpperCase() + message.slice(1) + ".")
  } else if (error.status) {
    throw new Error(error.message || "An unknown error occurred.")
  } else if (error.request) {
    throw new Error("No response received: " + error.request)
  } else {
    throw new Error("Error setting up the request: " + error.message)
  }
}
