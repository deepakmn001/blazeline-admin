"use client";

import { useEffect, useState } from "react";

type Category = {
  id: number;
  name: string;
};

export default function CatalogImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [brand, setBrand] = useState("VANTAGE");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/categories/")
      .then((r) => r.json())
      .then((data) => {
        setCategories(data.results || data);

        if ((data.results || data).length > 0) {
          setCategory(String((data.results || data)[0].id));
        }
      })
      .catch(console.error);
  }, []);

  async function upload() {
    if (!file) {
      alert("Choose PDF first.");
      return;
    }

    setLoading(true);

    const form = new FormData();

    form.append("pdf", file);
    form.append("brand", brand);
    form.append("category", category);

    try {
      const res = await fetch(
        "http://127.0.0.1:8000/api/catalog-import/upload/",
        {
          method: "POST",
          body: form,
        }
      );

      const data = await res.json();

      console.log(data);

      setResponse(data);
    } catch (err) {
      console.error(err);
      alert("Upload failed.");
    }

    setLoading(false);
  }

  return (
    <div className="p-10 space-y-6">

      <h1 className="text-3xl font-bold">
        Catalog Import Test
      </h1>

      <input
        type="file"
        accept=".pdf"
        onChange={(e) =>
          setFile(e.target.files?.[0] ?? null)
        }
      />

      <input
        className="border p-2 w-full"
        value={brand}
        onChange={(e) => setBrand(e.target.value)}
      />

      <select
        className="border p-2 w-full"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <button
        onClick={upload}
        disabled={loading}
        className="bg-orange-600 text-white px-6 py-3 rounded"
      >
        {loading ? "Uploading..." : "Upload Catalog"}
      </button>

      {response && (
        <pre className="bg-black text-green-400 p-4 rounded overflow-auto">
          {JSON.stringify(response, null, 2)}
        </pre>
      )}
    </div>
  );
}