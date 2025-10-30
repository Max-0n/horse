export async function postRequest<T>(url: string, bodyData: unknown): Promise<T> {
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(bodyData),
    })
    if (!response.ok) {
      throw new Error(`Error: ${response.statusText}`)
    }

    const data: T = await response.json()
    return data
  } catch (error) {
    console.error('Error with POST request:', error)
    throw error
  }
}
