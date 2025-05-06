"use client";

import React, { useState, useCallback } from "react";
import { useDropzone, Accept } from "react-dropzone";
import * as yup from "yup";
import toast, { Toaster } from "react-hot-toast";

const CLASSES = [
  "airplane",
  "automobile",
  "bird",
  "cat",
  "deer",
  "dog",
  "frog",
  "horse",
  "ship",
  "truck",
];

const MAX_FILE_SIZE_MB = 1; // Maximum allowed file size in MB

// Yup validation schema for image
const imageSchema = yup
  .mixed<File>()
  .required("Image is required")
  .test(
    "fileSize",
    `File size exceeds ${MAX_FILE_SIZE_MB}MB. Please select a smaller file.`,
    (file: File | null) => {
      return file ? file.size / 1024 / 1024 <= MAX_FILE_SIZE_MB : false;
    }
  )
  .test(
    "fileType",
    "Unsupported file type. Please select an image.",
    (file: File | null) => {
      return file ? file.type.startsWith("image/") : false;
    }
  );

const Page = () => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [correctLabel, setCorrectLabel] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [predictionResult, setPredictionResult] = useState<{
    label: string;
    confidence: number;
  } | null>(null);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      try {
        await imageSchema.validate(file);
        setFileError(null);
        setSelectedImage(URL.createObjectURL(file));
        setImageFile(file);
      } catch (err: any) {
        setFileError(err.message);
        setSelectedImage(null);
        setImageFile(null);
        toast.error(err.message); // toast error for file validation
      }
    }
  }, []);

  const acceptImages: Accept = {
    "image/*": [],
  };

  // @ts-ignore
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptImages,
    multiple: false,
  });

  const handlePredict = async () => {
    if (!imageFile) {
      setFileError("Please select an image.");
      toast.error("Please select an image.");
      return;
    }

    const formData = new FormData();
    formData.append("image", imageFile);
    if (correctLabel) {
      formData.append("correct_label", correctLabel);
    }

    try {
      toast.loading("Predicting...", { id: "predict" });

      const response = await fetch("http://127.0.0.1:8000/api/predict/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to predict");
      }

      const data = await response.json();
      console.log(data);
      setPredictionResult({
        label: data?.predicted_label,
        confidence: data?.confidence,
      });

      toast.success("Prediction successful!", { id: "predict" });
    } catch (error) {
      console.error("Error:", error);
      toast.error("There was an error with the prediction.", { id: "predict" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      {/* Toast Container */}
      <Toaster position="top-center" reverseOrder={false} />

      <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 bg-clip-text text-transparent mb-4">
        AI Image Prediction
      </h1>
      <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 w-full max-w-md rounded">
        You can only predict below classes:
        <ul className="list-disc ml-5 mt-2">
          {CLASSES.map((cls) => (
            <li key={cls}>{cls}</li>
          ))}
        </ul>
      </div>

      <div
        {...getRootProps()}
        className={`w-full max-w-md p-6 border-2 border-dashed rounded cursor-pointer ${
          isDragActive
            ? "border-blue-400 bg-blue-50"
            : "border-gray-300 bg-white"
        }`}
      >
        <input
          {...(getInputProps() as React.InputHTMLAttributes<HTMLInputElement>)}
        />
        {isDragActive ? (
          <p className="text-center text-blue-500">Drop the image here ...</p>
        ) : (
          <p className="text-center text-gray-500">
            Drag & drop an image here, or click to select
          </p>
        )}
      </div>

      {fileError && (
        <div className="mt-4 text-red-600 text-sm">
          <p>{fileError}</p>
        </div>
      )}

      {/* Image & Prediction Result Side by Side */}
      <div className="mt-6 flex flex-col md:flex-row items-center md:items-start gap-6 w-full max-w-md">
        {/* Image */}
        {selectedImage ? (
          <img
            src={selectedImage}
            alt="Selected"
            className="w-40 h-40 object-cover rounded shadow border"
          />
        ) : (
          <div className="w-40 h-40 bg-gray-200 flex items-center justify-center rounded shadow border text-gray-500">
            No Image
          </div>
        )}

        {/* Prediction Result */}
        <div className="bg-white rounded-lg shadow p-4 border w-full">
          <h2 className="text-lg font-semibold mb-2 text-gray-700">
            Prediction
          </h2>
          <p className="text-gray-600">
            <span className="font-medium">Label:</span>{" "}
            {predictionResult?.label || "No prediction yet"}
          </p>
          <p className="text-gray-600">
            <span className="font-medium">Confidence:</span>{" "}
            {predictionResult?.confidence
              ? predictionResult.confidence + "%"
              : "0%"}
          </p>
        </div>
      </div>

      {/* Label Dropdown */}
      <div className="mt-6 w-full max-w-md">
        <label className="block mb-2 font-medium text-gray-700">
          Correct Label
        </label>
        <select
          value={correctLabel}
          onChange={(e) => setCorrectLabel(e.target.value)}
          className="w-full p-2 border rounded-sm bg-white focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Select a class (Optional)</option>
          {CLASSES.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>

        <p className="text-sm text-gray-500 mt-1">
          You can train dataset with correct label information
        </p>
      </div>

      {/* Predict Button */}
      <button
        onClick={handlePredict}
        className="mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
      >
        {correctLabel ? "Predict & Train" : "Predict"}
      </button>
      <footer className="mt-10 text-xs text-gray-500 text-center">
        © {new Date().getFullYear()} — We trust your train misclassified data.
        After a month period train all misclassified data with scheduler
        automatically.
      </footer>
    </div>
  );
};

export default Page;
