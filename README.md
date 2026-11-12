
using UnityEngine;

public class CarController : MonoBehaviour
{
    [Header("Wheel Colliders")]
    public WheelCollider frontLeft;
    public WheelCollider frontRight;
    public WheelCollider rearLeft;
    public WheelCollider rearRight;

    [Header("Wheel Models")]
    public Transform frontLeftMesh;
    public Transform frontRightMesh;
    public Transform rearLeftMesh;
    public Transform rearRightMesh;

    [Header("Driving")]
    public float motorPower = 1800f;
    public float brakePower = 3500f;
    public float maxSpeed = 180f;
    public float steeringAngle = 30f;

    private Rigidbody rb;
    private float steering;
    private float acceleration;
    private float braking;

    public float Speed =>
        rb == null ? 0f : rb.linearVelocity.magnitude * 3.6f;

    void Start()
    {
        rb = GetComponent<Rigidbody>();
        rb.mass = 1200f;
        rb.centerOfMass = new Vector3(0, -0.5f, 0);
        rb.interpolation = RigidbodyInterpolation.Interpolate;
    }

    void FixedUpdate()
    {
        float currentSpeed = Speed;

        float torque = currentSpeed < maxSpeed
            ? acceleration * motorPower : 0f;

        rearLeft.motorTorque = torque;
        rearRight.motorTorque = torque;

        frontLeft.steerAngle = steering * steeringAngle;
        frontRight.steerAngle = steering * steeringAngle;

        float brakeTorque = braking * brakePower;

        frontLeft.brakeTorque = brakeTorque;
        frontRight.brakeTorque = brakeTorque;
        rearLeft.brakeTorque = brakeTorque;
        rearRight.brakeTorque = brakeTorque;

        UpdateWheel(frontLeft, frontLeftMesh);
        UpdateWheel(frontRight, frontRightMesh);
        UpdateWheel(rearLeft, rearLeftMesh);
        UpdateWheel(rearRight, rearRightMesh);
    }

    public void SetSteering(float value)
    {
        steering = Mathf.Clamp(value, -1f, 1f);
    }

    public void SetAcceleration(float value)
    {
        acceleration = Mathf.Clamp01(value);
    }

    public void SetBrake(float value)
    {
        braking = Mathf.Clamp01(value);
    }

    void UpdateWheel(WheelCollider wheel, Transform mesh)
    {
        if (wheel == null || mesh == null) return;

        wheel.GetWorldPose(out Vector3 position,
                           out Quaternion rotation);

        mesh.SetPositionAndRotation(position, rotation);
    }
}
